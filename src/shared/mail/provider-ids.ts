import type { MailProvider } from "./models";

export function createProviderAccountId(
  provider: Extract<MailProvider, "google" | "microsoft">,
  email: string
): string {
  return `${provider}:${email.trim().toLowerCase()}`;
}

export function createMicrosoftAccountId(email: string): string {
  return createProviderAccountId("microsoft", email);
}

export function isGoogleAccountId(accountId: string): boolean {
  return accountId.startsWith("google:");
}

export function isMicrosoftAccountId(accountId: string): boolean {
  return accountId.startsWith("microsoft:");
}

export function getMailProviderFromAccountId(accountId: string): MailProvider | null {
  if (isGoogleAccountId(accountId)) {
    return "google";
  }

  if (isMicrosoftAccountId(accountId)) {
    return "microsoft";
  }

  if (accountId.startsWith("demo:")) {
    return "demo";
  }

  return null;
}
