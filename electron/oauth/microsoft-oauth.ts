import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { shell } from "electron";
import {
  buildMicrosoftAuthUrl,
  createCodeChallenge,
  createCodeVerifier,
  createRandomState,
  validateOAuthCallback
} from "../../src/shared/auth/google-pkce";
import type {
  AuthSessionSummary,
  MicrosoftAccountProfile
} from "../../src/shared/contracts";
import { MICROSOFT_OAUTH_SCOPES } from "../../src/shared/contracts";
import {
  clearStoredSession,
  createMicrosoftSessionSummary,
  loadStoredSession,
  saveStoredSession,
  type StoredAuthSession
} from "./token-store";
import {
  createSingleFlight,
  parseRetryAfterHeader,
  retryWithBackoff
} from "../runtime/retry";

export class MicrosoftTokenRefreshError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryAfterMs: number | null,
    readonly errorCode: string | null,
    readonly transient: boolean
  ) {
    super(message);
    this.name = "MicrosoftTokenRefreshError";
  }
}

const refreshSingleFlight = createSingleFlight<string, MicrosoftTokenResponse>();

const NON_TRANSIENT_OAUTH_CODES = new Set([
  "invalid_grant",
  "invalid_client",
  "unauthorized_client",
  "invalid_request",
  "unsupported_grant_type",
  "invalid_scope",
  "consent_required",
  "interaction_required"
]);

const MICROSOFT_TENANT = "common";
const MICROSOFT_GRAPH_ME_ENDPOINT =
  "https://graph.microsoft.com/v1.0/me?$select=displayName,mail,userPrincipalName,userType";

interface MicrosoftTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  token_type: string;
}

interface MicrosoftGraphMeResponse {
  displayName?: string;
  mail?: string;
  userPrincipalName?: string;
  userType?: string;
}

interface AuthorizationResult {
  code: string;
  redirectUri: string;
  verifier: string;
}

function getMicrosoftTokenEndpoint(tenant = MICROSOFT_TENANT): string {
  return `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`;
}

export async function getStoredMicrosoftSession(
  clientId: string
): Promise<AuthSessionSummary | null> {
  const storedSession = await getAuthorizedMicrosoftSession(clientId);
  return storedSession?.summary ?? null;
}

export async function getAuthorizedMicrosoftSession(
  clientId: string
): Promise<StoredAuthSession | null> {
  const storedSession = await loadStoredSession("microsoft");

  if (!storedSession) {
    return null;
  }

  if (storedSession.expiresAt > Date.now() + 30_000) {
    return storedSession;
  }

  if (!storedSession.refreshToken) {
    await clearStoredSession("microsoft");
    return null;
  }

  const refreshedToken = await refreshAccessToken(clientId, storedSession);
  const nextSession: StoredAuthSession = {
    ...storedSession,
    accessToken: refreshedToken.access_token,
    expiresAt: Date.now() + refreshedToken.expires_in * 1000,
    tokenType: refreshedToken.token_type,
    scope: refreshedToken.scope ?? storedSession.scope
  };

  await saveStoredSession("microsoft", nextSession);
  return nextSession;
}

export async function signInWithMicrosoft(
  clientId: string
): Promise<AuthSessionSummary> {
  const authorization = await requestAuthorizationCode(clientId);
  const tokenResponse = await exchangeAuthorizationCode(clientId, authorization);
  const account = await fetchMicrosoftAccountProfile(tokenResponse.access_token);
  const summary = createMicrosoftSessionSummary(account, tokenResponse.scope);

  await saveStoredSession("microsoft", {
    summary,
    accessToken: tokenResponse.access_token,
    refreshToken: tokenResponse.refresh_token,
    tokenType: tokenResponse.token_type,
    expiresAt: Date.now() + tokenResponse.expires_in * 1000,
    scope: tokenResponse.scope
  });

  return summary;
}

export async function signOutFromMicrosoft(): Promise<void> {
  await clearStoredSession("microsoft");
}

async function requestAuthorizationCode(
  clientId: string
): Promise<AuthorizationResult> {
  const verifier = createCodeVerifier();
  const state = createRandomState();
  const challenge = createCodeChallenge(verifier);

  return await new Promise<AuthorizationResult>((resolve, reject) => {
    let settled = false;
    let timeoutHandle: NodeJS.Timeout | null = null;

    const settleSuccess = (payload: AuthorizationResult) => {
      if (settled) {
        return;
      }

      settled = true;

      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }

      resolve(payload);
    };

    const settleFailure = (error: Error) => {
      if (settled) {
        return;
      }

      settled = true;

      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }

      reject(error);
    };

    const server = createServer(
      async (request: IncomingMessage, response: ServerResponse) => {
        try {
          const hostHeader = request.headers.host ?? "127.0.0.1";
          const requestUrl = new URL(request.url ?? "/", `http://${hostHeader}`);

          if (requestUrl.pathname !== "/oauth/microsoft/callback") {
            response.writeHead(404).end("Not found");
            return;
          }

          const validation = validateOAuthCallback({
            expectedState: state,
            receivedState: requestUrl.searchParams.get("state"),
            receivedCode: requestUrl.searchParams.get("code"),
            receivedError: requestUrl.searchParams.get("error")
          });

          if (!validation.ok) {
            const message =
              validation.reason === "provider-error"
                ? "Authentication cancelled."
                : "Authentication failed.";
            writeCallbackHtml(response, message);
            settleFailure(
              new Error(
                validation.reason === "provider-error"
                  ? `Microsoft OAuth returned: ${validation.detail}`
                  : validation.detail
              )
            );
            server.close();
            return;
          }

          writeCallbackHtml(response, "HyperMail is connected.");

          settleSuccess({
            code: validation.code,
            redirectUri: `http://127.0.0.1:${(server.address() as AddressInfo).port}/oauth/microsoft/callback`,
            verifier
          });

          server.close();
        } catch (error) {
          settleFailure(
            error instanceof Error ? error : new Error("OAuth callback failed.")
          );
          server.close();
        }
      }
    );

    server.listen(0, "127.0.0.1", async () => {
      const address = server.address() as AddressInfo | null;

      if (!address) {
        settleFailure(new Error("Could not start OAuth callback server."));
        server.close();
        return;
      }

      const redirectUri = `http://127.0.0.1:${address.port}/oauth/microsoft/callback`;
      const authUrl = buildMicrosoftAuthUrl({
        clientId,
        redirectUri,
        scopes: MICROSOFT_OAUTH_SCOPES,
        state,
        codeChallenge: challenge,
        tenant: MICROSOFT_TENANT
      });

      try {
        await shell.openExternal(authUrl);
      } catch {
        settleFailure(
          new Error("HyperMail could not open the browser for Microsoft sign-in.")
        );
        server.close();
      }
    });

    timeoutHandle = setTimeout(() => {
      settleFailure(new Error("Microsoft OAuth timed out after waiting 2 minutes."));
      server.close();
    }, 120_000);
  });
}

async function exchangeAuthorizationCode(
  clientId: string,
  authorization: AuthorizationResult
): Promise<MicrosoftTokenResponse> {
  const response = await fetch(getMicrosoftTokenEndpoint(), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: "authorization_code",
      code: authorization.code,
      redirect_uri: authorization.redirectUri,
      code_verifier: authorization.verifier
    })
  });

  if (!response.ok) {
    throw new Error(`Microsoft token exchange failed with ${response.status}.`);
  }

  return (await response.json()) as MicrosoftTokenResponse;
}

async function refreshAccessToken(
  clientId: string,
  storedSession: StoredAuthSession
): Promise<MicrosoftTokenResponse> {
  const refreshToken = storedSession.refreshToken ?? "";
  const flightKey = `microsoft:${refreshToken}`;

  return await refreshSingleFlight(flightKey, async () => {
    try {
      const refreshed = await retryWithBackoff(
        () => performTokenRefresh(clientId, refreshToken),
        {
          maxAttempts: 3,
          baseDelayMs: 1000,
          isTransient: (error) =>
            error instanceof MicrosoftTokenRefreshError && error.transient,
          getRetryAfterMs: (error) =>
            error instanceof MicrosoftTokenRefreshError
              ? error.retryAfterMs
              : null
        }
      );
      return {
        ...refreshed,
        refresh_token: storedSession.refreshToken,
        scope: refreshed.scope ?? storedSession.scope
      };
    } catch (error) {
      if (
        error instanceof MicrosoftTokenRefreshError &&
        !error.transient
      ) {
        await clearStoredSession("microsoft");
      }
      throw error instanceof Error
        ? error
        : new Error("Microsoft token refresh failed.");
    }
  });
}

export async function performTokenRefresh(
  clientId: string,
  refreshToken: string
): Promise<MicrosoftTokenResponse> {
  let response: Response;
  try {
    response = await fetch(getMicrosoftTokenEndpoint(), {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        client_id: clientId,
        grant_type: "refresh_token",
        refresh_token: refreshToken
      })
    });
  } catch (networkError) {
    throw new MicrosoftTokenRefreshError(
      `Microsoft token refresh network error: ${(networkError as Error).message}`,
      0,
      null,
      null,
      true
    );
  }

  if (response.ok) {
    return (await response.json()) as MicrosoftTokenResponse;
  }

  const retryAfterMs = parseRetryAfterHeader(response.headers.get("Retry-After"));
  const { errorCode, detail } = await readOAuthErrorDetail(response);
  const transient =
    response.status === 429 ||
    (response.status >= 500 && response.status < 600) ||
    (response.status === 400 && errorCode !== null && !NON_TRANSIENT_OAUTH_CODES.has(errorCode));

  throw new MicrosoftTokenRefreshError(
    `Microsoft token refresh failed with ${response.status}${detail ? `: ${detail}` : "."}`,
    response.status,
    retryAfterMs,
    errorCode,
    transient
  );
}

async function readOAuthErrorDetail(
  response: Response
): Promise<{ errorCode: string | null; detail: string | null }> {
  const rawBody = await response.text();
  const trimmed = rawBody.trim();
  if (!trimmed) return { errorCode: null, detail: null };
  try {
    const parsed = JSON.parse(trimmed) as {
      error?: string;
      error_description?: string;
    };
    return {
      errorCode: parsed.error ?? null,
      detail:
        parsed.error_description ?? parsed.error ?? trimmed.slice(0, 280)
    };
  } catch {
    return { errorCode: null, detail: trimmed.slice(0, 280) };
  }
}

export async function fetchMicrosoftAccountProfile(
  accessToken: string
): Promise<MicrosoftAccountProfile> {
  const response = await fetch(MICROSOFT_GRAPH_ME_ENDPOINT, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error(`Microsoft profile lookup failed with ${response.status}.`);
  }

  const profile = (await response.json()) as MicrosoftGraphMeResponse;
  const email = profile.mail?.trim() || profile.userPrincipalName?.trim();

  if (!email) {
    throw new Error("Microsoft Graph did not return a usable mailbox address.");
  }

  return {
    email,
    name: profile.displayName ?? email,
    userType: profile.userType
  };
}

function writeCallbackHtml(response: ServerResponse, message: string): void {
  response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  response.end(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>HyperMail</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        font-family: Inter, system-ui, sans-serif;
        background: #09090b;
        color: #f5f7fb;
      }
      .card {
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(16, 17, 22, 0.92);
        border-radius: 18px;
        padding: 28px 32px;
        box-shadow: 0 18px 50px rgba(0, 0, 0, 0.4);
      }
      p {
        margin: 0;
        opacity: 0.78;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>HyperMail</h1>
      <p>${message} You can close this browser tab.</p>
    </div>
  </body>
</html>`);
}
