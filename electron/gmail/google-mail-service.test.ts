import { afterEach, describe, expect, it, vi } from "vitest";
import {
  GmailApiError,
  encodeRawMimeMessage,
  performGetUnsubscribe,
  performOneClickUnsubscribe,
  gmailJson,
  isGmailApiTransientError
} from "./google-mail-service";

function jsonResponse(
  status: number,
  body: unknown,
  headers: Record<string, string> = {}
): Response {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers }
  });
}

describe("isGmailApiTransientError", () => {
  it("treats 429 as transient", () => {
    expect(
      isGmailApiTransientError(new GmailApiError("r", 429, "/p", null, null))
    ).toBe(true);
  });

  it("treats 5xx as transient", () => {
    expect(
      isGmailApiTransientError(new GmailApiError("r", 503, "/p", null, null))
    ).toBe(true);
  });

  it("treats 400/401/403/404 as non-transient", () => {
    for (const status of [400, 401, 403, 404]) {
      expect(
        isGmailApiTransientError(new GmailApiError("r", status, "/p", null, null))
      ).toBe(false);
    }
  });

  it("treats fetch TypeError as transient", () => {
    expect(isGmailApiTransientError(new TypeError("fetch failed"))).toBe(true);
  });

  it("treats ECONNRESET as transient", () => {
    const err = new Error("reset") as Error & { code: string };
    err.code = "ECONNRESET";
    expect(isGmailApiTransientError(err)).toBe(true);
  });

  it("treats plain errors as non-transient", () => {
    expect(isGmailApiTransientError(new Error("boom"))).toBe(false);
  });
});

describe("gmailJson retry behavior", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("retries on 503 and succeeds on third attempt", async () => {
    let attempt = 0;
    global.fetch = vi.fn(async () => {
      attempt += 1;
      if (attempt < 3) return jsonResponse(503, { error: "Service unavailable" });
      return jsonResponse(200, { ok: true });
    }) as typeof fetch;

    const result = await gmailJson<{ ok: boolean }>("tok", "/labels");
    expect(result).toEqual({ ok: true });
    expect(attempt).toBe(3);
  });

  it("fails fast on 401 without retry", async () => {
    let attempt = 0;
    global.fetch = vi.fn(async () => {
      attempt += 1;
      return jsonResponse(401, { error: { message: "unauthenticated" } });
    }) as typeof fetch;

    await expect(gmailJson("tok", "/labels")).rejects.toBeInstanceOf(GmailApiError);
    expect(attempt).toBe(1);
  });

  it("exhausts attempts on persistent 429 and throws", async () => {
    let attempt = 0;
    global.fetch = vi.fn(async () => {
      attempt += 1;
      return jsonResponse(429, { error: { message: "rate" } }, { "Retry-After": "0" });
    }) as typeof fetch;

    await expect(gmailJson("tok", "/labels")).rejects.toBeInstanceOf(GmailApiError);
    expect(attempt).toBe(3);
  });
});

describe("encodeRawMimeMessage", () => {
  it("rejects line breaks in MIME header values", () => {
    expect(() =>
      encodeRawMimeMessage({
        from: "alex@example.com",
        to: ["maya@example.com"],
        cc: [],
        bcc: [],
        subject: "hello\r\nBcc: attacker@example.com",
        bodyHtml: "<p>Hello</p>",
        clientMessageId: "client-1"
      })
    ).toThrow("Subject cannot contain line breaks.");
  });

  it("keeps multiline body content valid", () => {
    expect(() =>
      encodeRawMimeMessage({
        from: "alex@example.com",
        to: ["maya@example.com"],
        cc: [],
        bcc: [],
        subject: "hello",
        bodyText: "Line one\r\nLine two",
        clientMessageId: "client-1"
      })
    ).not.toThrow();
  });
});

describe("unsubscribe fetch guards", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("blocks private unsubscribe endpoints before fetch", async () => {
    global.fetch = vi.fn() as typeof fetch;

    await expect(performGetUnsubscribe("https://127.0.0.1/unsub")).rejects.toThrow(
      "Unsubscribe endpoint is not an allowed remote HTTPS URL."
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("uses manual redirects for unsubscribe requests", async () => {
    global.fetch = vi.fn(async () => jsonResponse(302, "")) as typeof fetch;

    await expect(performGetUnsubscribe("https://example.com/unsub")).rejects.toThrow(
      "Unsubscribe request failed with 302."
    );
    expect(global.fetch).toHaveBeenCalledWith("https://example.com/unsub", {
      method: "GET",
      redirect: "manual"
    });
  });

  it("blocks private one-click unsubscribe endpoints before fetch", async () => {
    global.fetch = vi.fn() as typeof fetch;

    await expect(performOneClickUnsubscribe("https://10.0.0.1/unsub")).rejects.toThrow(
      "Unsubscribe endpoint is not an allowed remote HTTPS URL."
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
