import keytar from "keytar";
import type {
  AuthProvider,
  AuthSessionSummary,
  GmailAccountProfile,
  MicrosoftAccountProfile
} from "../../src/shared/contracts";

const SERVICE_NAME = "HyperMail";

export interface StoredAuthSession<
  TSummary extends AuthSessionSummary = AuthSessionSummary
> {
  summary: TSummary;
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  expiresAt: number;
  scope: string;
}

function getAccountKey(provider: AuthProvider): string {
  return `${provider}-auth-session`;
}

export async function loadStoredSession<TSummary extends AuthSessionSummary>(
  provider: AuthProvider
): Promise<StoredAuthSession<TSummary> | null> {
  const rawSession = await keytar.getPassword(SERVICE_NAME, getAccountKey(provider));

  if (!rawSession) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawSession) as StoredAuthSession<TSummary>;
    return parsed;
  } catch {
    await clearStoredSession(provider);
    return null;
  }
}

export async function loadLatestStoredSession(): Promise<StoredAuthSession | null> {
  const sessions = await Promise.all([
    loadStoredSession("google"),
    loadStoredSession("microsoft")
  ]);

  return (
    sessions
      .filter((session): session is StoredAuthSession => session !== null)
      .sort((left, right) => right.summary.connectedAt - left.summary.connectedAt)[0] ??
    null
  );
}

export async function saveStoredSession(
  provider: AuthProvider,
  session: StoredAuthSession
): Promise<void> {
  await keytar.setPassword(
    SERVICE_NAME,
    getAccountKey(provider),
    JSON.stringify(session)
  );
}

export async function clearStoredSession(provider: AuthProvider): Promise<void> {
  await keytar.deletePassword(SERVICE_NAME, getAccountKey(provider));
}

export async function clearAllStoredSessions(): Promise<void> {
  await Promise.all([clearStoredSession("google"), clearStoredSession("microsoft")]);
}

export function createGoogleSessionSummary(
  account: GmailAccountProfile,
  scope: string,
  connectedAt = Date.now()
): AuthSessionSummary {
  return {
    provider: "google",
    account,
    scopes: scope.split(" ").filter(Boolean),
    connectedAt
  };
}

export function createMicrosoftSessionSummary(
  account: MicrosoftAccountProfile,
  scope: string,
  connectedAt = Date.now()
): AuthSessionSummary {
  return {
    provider: "microsoft",
    account,
    scopes: scope.split(" ").filter(Boolean),
    connectedAt
  };
}
