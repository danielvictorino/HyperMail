import { createHash, randomBytes } from "node:crypto";

export interface BuildGoogleAuthUrlOptions {
  clientId: string;
  redirectUri: string;
  scopes: readonly string[];
  state: string;
  codeChallenge: string;
}

export interface BuildMicrosoftAuthUrlOptions {
  clientId: string;
  redirectUri: string;
  scopes: readonly string[];
  state: string;
  codeChallenge: string;
  tenant?: string;
}

export function base64UrlEncode(input: Buffer): string {
  return input
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function createCodeVerifier(byteLength = 64): string {
  return base64UrlEncode(randomBytes(byteLength));
}

export function createRandomState(byteLength = 32): string {
  return base64UrlEncode(randomBytes(byteLength));
}

export function createCodeChallenge(verifier: string): string {
  return base64UrlEncode(createHash("sha256").update(verifier).digest());
}

export interface OAuthCallbackValidationInput {
  expectedState: string;
  receivedState: string | null;
  receivedCode: string | null;
  receivedError: string | null;
}

export type OAuthCallbackValidation =
  | { ok: true; code: string }
  | {
      ok: false;
      reason: "provider-error" | "state-mismatch" | "missing-code";
      detail: string;
    };

export function validateOAuthCallback(
  input: OAuthCallbackValidationInput
): OAuthCallbackValidation {
  if (input.receivedError) {
    return {
      ok: false,
      reason: "provider-error",
      detail: input.receivedError
    };
  }
  if (input.receivedState !== input.expectedState) {
    return {
      ok: false,
      reason: "state-mismatch",
      detail: "OAuth callback state did not match the request state."
    };
  }
  if (!input.receivedCode) {
    return {
      ok: false,
      reason: "missing-code",
      detail: "OAuth callback did not include an authorization code."
    };
  }
  return { ok: true, code: input.receivedCode };
}

export function buildGoogleAuthUrl(options: BuildGoogleAuthUrlOptions): string {
  const searchParams = new URLSearchParams({
    client_id: options.clientId,
    redirect_uri: options.redirectUri,
    response_type: "code",
    scope: options.scopes.join(" "),
    access_type: "offline",
    prompt: "consent select_account",
    code_challenge_method: "S256",
    code_challenge: options.codeChallenge,
    state: options.state
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${searchParams.toString()}`;
}

export function buildMicrosoftAuthUrl(options: BuildMicrosoftAuthUrlOptions): string {
  const tenant = options.tenant?.trim() || "common";
  const searchParams = new URLSearchParams({
    client_id: options.clientId,
    redirect_uri: options.redirectUri,
    response_type: "code",
    response_mode: "query",
    scope: options.scopes.join(" "),
    code_challenge_method: "S256",
    code_challenge: options.codeChallenge,
    state: options.state
  });

  return `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?${searchParams.toString()}`;
}
