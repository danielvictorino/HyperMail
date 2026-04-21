import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { shell } from "electron";
import {
  buildMicrosoftAuthUrl,
  createCodeChallenge,
  createCodeVerifier,
  createRandomState
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

          const callbackState = requestUrl.searchParams.get("state");
          const callbackCode = requestUrl.searchParams.get("code");
          const callbackError = requestUrl.searchParams.get("error");

          if (callbackError) {
            writeCallbackHtml(response, "Authentication cancelled.");
            settleFailure(new Error(`Microsoft OAuth returned: ${callbackError}`));
            server.close();
            return;
          }

          if (!callbackCode || callbackState !== state) {
            writeCallbackHtml(response, "Authentication failed.");
            settleFailure(new Error("OAuth callback was invalid."));
            server.close();
            return;
          }

          writeCallbackHtml(response, "HyperMail is connected.");

          settleSuccess({
            code: callbackCode,
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
  const response = await fetch(getMicrosoftTokenEndpoint(), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: "refresh_token",
      refresh_token: storedSession.refreshToken ?? ""
    })
  });

  if (!response.ok) {
    await clearStoredSession("microsoft");
    throw new Error(`Microsoft token refresh failed with ${response.status}.`);
  }

  const refreshed = (await response.json()) as MicrosoftTokenResponse;
  return {
    ...refreshed,
    refresh_token: storedSession.refreshToken,
    scope: refreshed.scope ?? storedSession.scope
  };
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
