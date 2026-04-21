import { describe, expect, it } from "vitest";
import {
  buildGoogleAuthUrl,
  createCodeChallenge,
  createRandomState,
  validateOAuthCallback
} from "./google-pkce";

describe("google-pkce", () => {
  it("creates the RFC7636 code challenge", () => {
    const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
    expect(createCodeChallenge(verifier)).toBe(
      "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"
    );
  });

  it("builds a Google auth URL with the expected params", () => {
    const url = new URL(
      buildGoogleAuthUrl({
        clientId: "test-client",
        redirectUri: "http://127.0.0.1:4242/oauth/google/callback",
        scopes: ["openid", "email"],
        state: "state-123",
        codeChallenge: "challenge-xyz"
      })
    );

    expect(url.origin).toBe("https://accounts.google.com");
    expect(url.searchParams.get("client_id")).toBe("test-client");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "http://127.0.0.1:4242/oauth/google/callback"
    );
    expect(url.searchParams.get("scope")).toBe("openid email");
    expect(url.searchParams.get("state")).toBe("state-123");
    expect(url.searchParams.get("code_challenge")).toBe("challenge-xyz");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
  });

  it("createRandomState produces high-entropy unique values", () => {
    const samples = new Set<string>();
    for (let i = 0; i < 100; i += 1) {
      samples.add(createRandomState());
    }
    expect(samples.size).toBe(100);
    for (const sample of samples) {
      expect(sample.length).toBeGreaterThanOrEqual(32);
    }
  });

  describe("validateOAuthCallback", () => {
    it("accepts a matching state and code", () => {
      const result = validateOAuthCallback({
        expectedState: "s",
        receivedState: "s",
        receivedCode: "abc",
        receivedError: null
      });
      expect(result).toEqual({ ok: true, code: "abc" });
    });

    it("rejects a tampered state", () => {
      const result = validateOAuthCallback({
        expectedState: "s",
        receivedState: "tampered",
        receivedCode: "abc",
        receivedError: null
      });
      expect(result.ok).toBe(false);
      expect(result.ok === false && result.reason).toBe("state-mismatch");
    });

    it("rejects a missing state", () => {
      const result = validateOAuthCallback({
        expectedState: "s",
        receivedState: null,
        receivedCode: "abc",
        receivedError: null
      });
      expect(result.ok).toBe(false);
      expect(result.ok === false && result.reason).toBe("state-mismatch");
    });

    it("surfaces a provider error before checking state", () => {
      const result = validateOAuthCallback({
        expectedState: "s",
        receivedState: "s",
        receivedCode: null,
        receivedError: "access_denied"
      });
      expect(result.ok).toBe(false);
      expect(result.ok === false && result.reason).toBe("provider-error");
    });

    it("rejects a matching state with no code", () => {
      const result = validateOAuthCallback({
        expectedState: "s",
        receivedState: "s",
        receivedCode: null,
        receivedError: null
      });
      expect(result.ok).toBe(false);
      expect(result.ok === false && result.reason).toBe("missing-code");
    });
  });
});
