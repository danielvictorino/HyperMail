import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MicrosoftTokenRefreshError,
  performTokenRefresh
} from "./microsoft-oauth";

function mockFetchResponse(
  status: number,
  body: unknown,
  headers: Record<string, string> = {}
): Response {
  const text = typeof body === "string" ? body : JSON.stringify(body);
  return new Response(text, {
    status,
    headers: { "Content-Type": "application/json", ...headers }
  });
}

describe("microsoft performTokenRefresh", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("returns parsed token response on 200", async () => {
    global.fetch = vi.fn(async () =>
      mockFetchResponse(200, {
        access_token: "tok",
        expires_in: 3600,
        scope: "Mail.Read",
        token_type: "Bearer"
      })
    ) as typeof fetch;

    const result = await performTokenRefresh("client", "refresh");
    expect(result.access_token).toBe("tok");
  });

  it("classifies 400 invalid_grant as non-transient", async () => {
    global.fetch = vi.fn(async () =>
      mockFetchResponse(400, {
        error: "invalid_grant",
        error_description:
          "AADSTS70008: The refresh token has expired or is invalid."
      })
    ) as typeof fetch;

    try {
      await performTokenRefresh("client", "refresh");
      throw new Error("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(MicrosoftTokenRefreshError);
      const refreshError = error as MicrosoftTokenRefreshError;
      expect(refreshError.status).toBe(400);
      expect(refreshError.errorCode).toBe("invalid_grant");
      expect(refreshError.transient).toBe(false);
    }
  });

  it("classifies 400 interaction_required as non-transient", async () => {
    global.fetch = vi.fn(async () =>
      mockFetchResponse(400, {
        error: "interaction_required",
        error_description: "AADSTS50076: MFA required."
      })
    ) as typeof fetch;

    try {
      await performTokenRefresh("client", "refresh");
      throw new Error("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(MicrosoftTokenRefreshError);
      expect((error as MicrosoftTokenRefreshError).transient).toBe(false);
    }
  });

  it("classifies 503 as transient", async () => {
    global.fetch = vi.fn(async () =>
      mockFetchResponse(503, { error: "service_unavailable" })
    ) as typeof fetch;

    try {
      await performTokenRefresh("client", "refresh");
      throw new Error("should have thrown");
    } catch (error) {
      expect((error as MicrosoftTokenRefreshError).transient).toBe(true);
    }
  });

  it("classifies 429 as transient and captures Retry-After", async () => {
    global.fetch = vi.fn(async () =>
      mockFetchResponse(
        429,
        { error: "throttled" },
        { "Retry-After": "9" }
      )
    ) as typeof fetch;

    try {
      await performTokenRefresh("client", "refresh");
      throw new Error("should have thrown");
    } catch (error) {
      const refreshError = error as MicrosoftTokenRefreshError;
      expect(refreshError.transient).toBe(true);
      expect(refreshError.retryAfterMs).toBe(9000);
    }
  });

  it("wraps network errors as transient", async () => {
    global.fetch = vi.fn(async () => {
      throw new TypeError("fetch failed");
    }) as typeof fetch;

    try {
      await performTokenRefresh("client", "refresh");
      throw new Error("should have thrown");
    } catch (error) {
      const refreshError = error as MicrosoftTokenRefreshError;
      expect(refreshError.status).toBe(0);
      expect(refreshError.transient).toBe(true);
    }
  });
});
