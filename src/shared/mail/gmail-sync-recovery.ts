export type GmailSyncRecoveryReason = "history-gap";

interface GmailSyncRecoveryErrorLike {
  status?: number | null;
  path?: string | null;
  detail?: string | null;
  message?: string | null;
}

export function getGmailSyncRecoveryReason(
  error: GmailSyncRecoveryErrorLike
): GmailSyncRecoveryReason | null {
  const status = error.status ?? null;

  if (status !== 400 && status !== 404 && status !== 410) {
    return null;
  }

  const haystack = [error.path, error.detail, error.message]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .toLowerCase();

  if (!haystack.includes("history")) {
    return null;
  }

  if (
    haystack.includes("/history") ||
    haystack.includes("starthistoryid") ||
    haystack.includes("start history") ||
    haystack.includes("historyid")
  ) {
    return "history-gap";
  }

  return null;
}
