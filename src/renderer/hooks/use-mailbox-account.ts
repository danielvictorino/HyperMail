import { useMemo } from "react";
import type { AuthSessionSummary } from "@shared/contracts";
import { createGoogleAccountId } from "@shared/mail/google-transformers";
import { createMicrosoftAccountId } from "@shared/mail/provider-ids";
import type { MailAccountDescriptor } from "@shared/mail/models";
import { DEMO_ACCOUNT } from "../offline/demo/seed-mailbox";

export function buildAccountDescriptor(
  session: AuthSessionSummary | null
): MailAccountDescriptor {
  if (!session) {
    return DEMO_ACCOUNT;
  }

  return {
    id:
      session.provider === "google"
        ? createGoogleAccountId(session.account.email)
        : createMicrosoftAccountId(session.account.email),
    email: session.account.email,
    displayName: session.account.name ?? session.account.email,
    provider: session.provider,
    connectedAt: session.connectedAt
  };
}

export function useMailboxAccount(
  session: AuthSessionSummary | null
): MailAccountDescriptor {
  return useMemo(() => buildAccountDescriptor(session), [session]);
}
