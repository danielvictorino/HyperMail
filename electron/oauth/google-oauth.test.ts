import { afterEach, describe, expect, it, vi } from "vitest";
import {
  GoogleTokenRefreshError,
  performTokenRefresh
} from "./google-oauth";

function mockFetchResponse(
  status: number,
  body: unknown,
  headers: Record<string, string> = {}
): Response {
  const text = typeof body === "string" ? body : JSON.stringify(body);
  return new Response(text, {
    status,
    headers: {
      "Content-Type": "application/json",
      ...headers
    }
  });
}

describe("performTokenRefresh", () => {
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
        scope: "openid",
        token_type: "Bearer"
      })
    ) as typeof fetch;

    const result = await performTokenRefresh("client", "refresh");
    expect(result.access_token).toBe("tok");
    expect(result.expires_in).toBe(3600);
  });

  it("classifies 400 invalid_grant as non-transient", async () => {
    global.fetch = vi.fn(async () =>
      mockFetchResponse(400, {
        error: "invalid_grant",
        error_description: "Token has been expired or revoked."
      })
    ) as typeof fetch;

    try {
      await performTokenRefresh("client", "refresh");
      throw new Error("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(GoogleTokenRefreshError);
      const refreshError = error as GoogleTokenRefreshError;
      expect(refreshError.status).toBe(400);
      expect(refreshError.errorCode).toBe("invalid_grant");
      expect(refreshError.transient).toBe(false);
    }
  });

  it("classifies 500 as transient", async () => {
    global.fetch = vi.fn(async () =>
      mockFetchResponse(500, { error: "server_error" })
    ) as typeof fetch;

    try {
      await performTokenRefresh("client", "refresh");
      throw new Error("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(GoogleTokenRefreshError);
      expect((error as GoogleTokenRefreshError).transient).toBe(true);
    }
  });

  it("classifies 429 as transient and captures Retry-After", async () => {
    global.fetch = vi.fn(async () =>
      mockFetchResponse(429, { error: "rate_limit_exceeded" }, { "Retry-After": "7" })
    ) as typeof fetch;

    try {
      await performTokenRefresh("client", "refresh");
      throw new Error("should have thrown");
    } catch (error) {
      const refreshError = error as GoogleTokenRefreshError;
      expect(refreshError.transient).toBe(true);
      expect(refreshError.retryAfterMs).toBe(7000);
    }
  });

  it("classifies 400 with unknown error code as transient", async () => {
    global.fetch = vi.fn(async () =>
      mockFetchResponse(400, { error: "transient_backend_hiccup" })
    ) as typeof fetch;

    try {
      await performTokenRefresh("client", "refresh");
      throw new Error("should have thrown");
    } catch (error) {
      expect((error as GoogleTokenRefreshError).transient).toBe(true);
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
      const refreshError = error as GoogleTokenRefreshError;
      expect(refreshError.status).toBe(0);
      expect(refreshError.transient).toBe(true);
    }
  });
});
