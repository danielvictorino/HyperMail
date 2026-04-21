import type {
  CachedAttachmentPayload,
  DownloadGmailAttachmentRequest,
  GmailMailboxSyncPayload,
  GmailMailboxSyncRequest,
  SendDraftRequest,
  SendDraftResult,
  SetThreadArchivedRequest,
  SetThreadStarredRequest,
  UnsubscribeThreadRequest
} from "../../src/shared/contracts";
import { getGmailSyncRecoveryReason } from "../../src/shared/mail/gmail-sync-recovery";
import {
  createGoogleAccountId,
  createGoogleLocalAccount,
  getGoogleRemoteMessageId,
  createGoogleThreadLocalId,
  getGoogleRemoteThreadId,
  mapGmailLabelsToLocal,
  mapGmailThreadToSnapshot,
  type GmailLabelResource,
  type GmailThreadResource
} from "../../src/shared/mail/google-transformers";
import type { LocalMailUnsubscribe } from "../../src/shared/mail/models";
import {
  fetchGmailAccountProfile,
  getAuthorizedGoogleSession
} from "../oauth/google-oauth";
import { parseRetryAfterHeader, retryWithBackoff } from "../runtime/retry";

const GMAIL_API_BASE_URL = "https://gmail.googleapis.com/gmail/v1/users/me";
const DEFAULT_SYNC_THREAD_LIMIT = 60;
const THREAD_FETCH_CONCURRENCY = 8;

interface GmailListThreadsResponse {
  threads?: Array<{ id: string }>;
  nextPageToken?: string;
}

interface GmailHistoryMessageReference {
  id: string;
  threadId: string;
}

interface GmailHistoryRecord {
  messagesAdded?: Array<{ message?: GmailHistoryMessageReference }>;
  messagesDeleted?: Array<{ message?: GmailHistoryMessageReference }>;
  labelsAdded?: Array<{ message?: GmailHistoryMessageReference }>;
  labelsRemoved?: Array<{ message?: GmailHistoryMessageReference }>;
}

interface GmailListHistoryResponse {
  history?: GmailHistoryRecord[];
  historyId?: string;
  nextPageToken?: string;
}

interface GmailAttachmentResponse {
  data?: string;
  size?: number;
}

export class GmailApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly path: string,
    readonly detail: string | null = null,
    readonly retryAfterMs: number | null = null
  ) {
    super(message);
    this.name = "GmailApiError";
  }
}

export function isGmailApiTransientError(error: unknown): boolean {
  if (!(error instanceof GmailApiError)) {
    if (error instanceof TypeError) return true;
    const code = (error as { code?: string } | null)?.code;
    if (typeof code === "string") {
      const transient = new Set([
        "ECONNRESET",
        "ECONNREFUSED",
        "ETIMEDOUT",
        "ENETUNREACH",
        "ENOTFOUND",
        "EAI_AGAIN",
        "UND_ERR_SOCKET",
        "UND_ERR_CONNECT_TIMEOUT"
      ]);
      return transient.has(code);
    }
    return false;
  }
  if (error.status === 429) return true;
  if (error.status >= 500 && error.status < 600) return true;
  return false;
}

function getGmailRetryAfterMs(error: unknown): number | null {
  if (error instanceof GmailApiError) return error.retryAfterMs;
  return null;
}

async function createGmailApiError(
  response: Response,
  path: string
): Promise<GmailApiError> {
  const detail = await readGmailErrorDetail(response);
  const suffix = detail ? `: ${detail}` : ".";
  const retryAfterMs = parseRetryAfterHeader(response.headers.get("Retry-After"));

  return new GmailApiError(
    `Gmail request to ${path} failed with ${response.status}${suffix}`,
    response.status,
    path,
    detail,
    retryAfterMs
  );
}

async function readGmailErrorDetail(response: Response): Promise<string | null> {
  const rawBody = await response.text();
  const trimmedBody = rawBody.trim();

  if (!trimmedBody) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmedBody) as {
      error?: {
        message?: string;
        errors?: Array<{
          reason?: string;
          message?: string;
        }>;
      };
    };
    const detailParts = [
      parsed.error?.message?.trim(),
      ...(parsed.error?.errors ?? []).flatMap((item) =>
        [item.reason?.trim(), item.message?.trim()].filter(Boolean)
      )
    ].filter((value): value is string => Boolean(value));

    if (detailParts.length > 0) {
      return [...new Set(detailParts)].join(" · ");
    }
  } catch {
    // Fall through to the raw body when Gmail does not return JSON.
  }

  return trimmedBody.slice(0, 280);
}

export async function gmailJson<T>(
  accessToken: string,
  path: string,
  init?: RequestInit
): Promise<T> {
  return await retryWithBackoff(
    async () => {
      const response = await fetch(`${GMAIL_API_BASE_URL}${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          ...(init?.headers ?? {})
        }
      });

      if (!response.ok) {
        throw await createGmailApiError(response, path);
      }

      return (await response.json()) as T;
    },
    {
      maxAttempts: 3,
      baseDelayMs: 1000,
      isTransient: isGmailApiTransientError,
      getRetryAfterMs: getGmailRetryAfterMs
    }
  );
}

async function gmailModify(
  accessToken: string,
  remoteThreadId: string,
  input: {
    addLabelIds?: string[];
    removeLabelIds?: string[];
  }
): Promise<void> {
  await retryWithBackoff(
    async () => {
      const response = await fetch(
        `${GMAIL_API_BASE_URL}/threads/${remoteThreadId}/modify`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(input)
        }
      );

      if (!response.ok) {
        throw await createGmailApiError(
          response,
          `/threads/${remoteThreadId}/modify`
        );
      }
    },
    {
      maxAttempts: 3,
      baseDelayMs: 1000,
      isTransient: isGmailApiTransientError,
      getRetryAfterMs: getGmailRetryAfterMs
    }
  );
}

async function gmailSendMessage(
  accessToken: string,
  body: Record<string, unknown>
): Promise<{ id?: string }> {
  return await gmailJson<{ id?: string }>(accessToken, "/messages/send", {
    method: "POST",
    body: JSON.stringify(body)
  });
}

async function loadGoogleSessionForAccount(
  clientId: string,
  accountId: string
) {
  const session = await getAuthorizedGoogleSession(clientId);

  if (!session) {
    throw new Error("Connect Gmail before syncing or mutating mailbox state.");
  }

  const expectedAccountId = createGoogleAccountId(session.summary.account.email);

  if (expectedAccountId !== accountId) {
    throw new Error(
      `The active Gmail session does not match ${accountId}. Reconnect the correct account.`
    );
  }

  return session;
}

async function listGmailLabels(accessToken: string): Promise<GmailLabelResource[]> {
  const response = await gmailJson<{ labels?: GmailLabelResource[] }>(
    accessToken,
    "/labels"
  );

  return response.labels ?? [];
}

async function listRecentThreadIds(
  accessToken: string,
  maxResults: number
): Promise<string[]> {
  const ids: string[] = [];
  let nextPageToken: string | undefined;

  while (ids.length < maxResults) {
    const params = new URLSearchParams({
      maxResults: String(Math.min(100, maxResults - ids.length))
    });

    if (nextPageToken) {
      params.set("pageToken", nextPageToken);
    }

    const response = await gmailJson<GmailListThreadsResponse>(
      accessToken,
      `/threads?${params.toString()}`
    );

    ids.push(...(response.threads ?? []).map((thread) => thread.id));

    if (!response.nextPageToken) {
      break;
    }

    nextPageToken = response.nextPageToken;
  }

  return [...new Set(ids)];
}

async function listChangedThreadIds(
  accessToken: string,
  startHistoryId: string
): Promise<string[]> {
  const changedThreadIds = new Set<string>();
  let nextPageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      startHistoryId
    });

    if (nextPageToken) {
      params.set("pageToken", nextPageToken);
    }

    const response = await gmailJson<GmailListHistoryResponse>(
      accessToken,
      `/history?${params.toString()}`
    );

    for (const item of response.history ?? []) {
      for (const record of [
        ...(item.messagesAdded ?? []),
        ...(item.messagesDeleted ?? []),
        ...(item.labelsAdded ?? []),
        ...(item.labelsRemoved ?? [])
      ]) {
        const threadId = record.message?.threadId;

        if (threadId) {
          changedThreadIds.add(threadId);
        }
      }
    }

    nextPageToken = response.nextPageToken;
  } while (nextPageToken);

  return [...changedThreadIds];
}

async function fetchThread(
  accessToken: string,
  remoteThreadId: string
): Promise<GmailThreadResource | null> {
  try {
    return await gmailJson<GmailThreadResource>(
      accessToken,
      `/threads/${remoteThreadId}?format=full`
    );
  } catch (error) {
    if (error instanceof GmailApiError && error.status === 404) {
      return null;
    }

    throw error;
  }
}

async function fetchThreads(
  accessToken: string,
  remoteThreadIds: string[]
): Promise<Array<GmailThreadResource | null>> {
  const threads: Array<GmailThreadResource | null> = [];

  for (let index = 0; index < remoteThreadIds.length; index += THREAD_FETCH_CONCURRENCY) {
    const batch = remoteThreadIds.slice(index, index + THREAD_FETCH_CONCURRENCY);
    const nextThreads = await Promise.all(
      batch.map((remoteThreadId) => fetchThread(accessToken, remoteThreadId))
    );
    threads.push(...nextThreads);
  }

  return threads;
}

export async function syncGmailMailbox(
  clientId: string,
  input: GmailMailboxSyncRequest
): Promise<GmailMailboxSyncPayload> {
  const session = await loadGoogleSessionForAccount(clientId, input.accountId);
  const accessToken = session.accessToken;
  const profile = await fetchGmailAccountProfile(accessToken);
  const localAccount = createGoogleLocalAccount({
    profile,
    connectedAt: session.summary.connectedAt
  });
  const labels = mapGmailLabelsToLocal(
    localAccount.id,
    await listGmailLabels(accessToken)
  );

  const requestedHistoryId = input.historyId?.trim() || null;
  let mode: "full" | "incremental" = requestedHistoryId ? "incremental" : "full";
  let recoveryReason: GmailMailboxSyncPayload["recoveryReason"] = null;
  let remoteThreadIds: string[] = [];

  if (requestedHistoryId) {
    try {
      remoteThreadIds = await listChangedThreadIds(accessToken, requestedHistoryId);
    } catch (error) {
      const nextRecoveryReason =
        error instanceof GmailApiError ? getGmailSyncRecoveryReason(error) : null;

      if (nextRecoveryReason) {
        mode = "full";
        recoveryReason = nextRecoveryReason;
      } else {
        throw error;
      }
    }
  }

  if (mode === "full") {
    remoteThreadIds = await listRecentThreadIds(
      accessToken,
      input.maxResults ?? DEFAULT_SYNC_THREAD_LIMIT
    );
  }

  const rawThreads = await fetchThreads(accessToken, remoteThreadIds);
  const threadSnapshots = rawThreads
    .map((thread) =>
      thread ? mapGmailThreadToSnapshot(localAccount, thread) : null
    )
    .filter((thread): thread is NonNullable<typeof thread> => thread !== null);

  const fetchedThreadIds = new Set(threadSnapshots.map((thread) => thread.thread.id));
  const removedThreadIds = remoteThreadIds
    .map((remoteThreadId) => createGoogleThreadLocalId(localAccount.id, remoteThreadId))
    .filter((threadId) => !fetchedThreadIds.has(threadId));

  return {
    account: localAccount,
    labels,
    threadSnapshots,
    removedThreadIds,
    activeThreadIds:
      mode === "full"
        ? threadSnapshots.map((thread) => thread.thread.id)
        : [],
    historyId: profile.historyId,
    mode,
    recoveryReason,
    syncedAt: Date.now()
  };
}

export async function persistThreadStarredState(
  clientId: string,
  input: SetThreadStarredRequest
): Promise<void> {
  const session = await loadGoogleSessionForAccount(clientId, input.accountId);
  const remoteThreadId = getGoogleRemoteThreadId(input.accountId, input.threadId);

  await gmailModify(session.accessToken, remoteThreadId, {
    addLabelIds: input.starred ? ["STARRED"] : [],
    removeLabelIds: input.starred ? [] : ["STARRED"]
  });
}

export async function persistThreadArchivedState(
  clientId: string,
  input: SetThreadArchivedRequest
): Promise<void> {
  const session = await loadGoogleSessionForAccount(clientId, input.accountId);
  const remoteThreadId = getGoogleRemoteThreadId(input.accountId, input.threadId);

  await gmailModify(session.accessToken, remoteThreadId, {
    addLabelIds: input.archived ? [] : ["INBOX"],
    removeLabelIds: input.archived ? ["INBOX"] : []
  });
}

export async function unsubscribeGmailThread(
  clientId: string,
  input: UnsubscribeThreadRequest
): Promise<void> {
  const session = await loadGoogleSessionForAccount(clientId, input.accountId);
  const remoteThreadId = getGoogleRemoteThreadId(input.accountId, input.threadId);

  await performUnsubscribeRequest(session.accessToken, session.summary.account.email, input.unsubscribe);
  await gmailModify(session.accessToken, remoteThreadId, {
    addLabelIds: [],
    removeLabelIds: ["INBOX"]
  });
}

export async function downloadGmailAttachment(
  clientId: string,
  input: DownloadGmailAttachmentRequest
): Promise<CachedAttachmentPayload> {
  const session = await loadGoogleSessionForAccount(clientId, input.accountId);
  const remoteMessageId = getGoogleRemoteMessageId(input.accountId, input.messageId);
  const response = await gmailJson<GmailAttachmentResponse>(
    session.accessToken,
    `/messages/${remoteMessageId}/attachments/${input.attachmentId}`
  );
  const downloadedAt = Date.now();

  return {
    id: `${input.messageId}:attachment-cache:${input.attachmentId}`,
    accountId: input.accountId,
    threadId: input.threadId,
    messageId: input.messageId,
    attachmentId: input.attachmentId,
    filename: input.filename,
    mimeType: input.mimeType,
    size: response.size ?? input.size,
    contentBase64: normalizeBase64Url(response.data ?? ""),
    downloadedAt
  };
}

export async function sendGmailDraft(
  clientId: string,
  input: SendDraftRequest
): Promise<SendDraftResult> {
  const session = await loadGoogleSessionForAccount(clientId, input.accountId);
  const remoteThreadId = getGoogleRemoteThreadId(input.accountId, input.threadId);
  const sentAt = Date.now();
  const response = await gmailSendMessage(session.accessToken, {
    threadId: remoteThreadId,
    raw: encodeRawMimeMessage({
      from: session.summary.account.email,
      to: input.to,
      cc: input.cc,
      bcc: input.bcc,
      subject: input.subject,
      bodyHtml: input.bodyHtml,
      clientMessageId: input.clientMessageId
    })
  });

  return {
    remoteMessageId: response.id,
    sentAt
  };
}

function encodeRawMimeMessage(input: {
  from: string;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  bodyHtml?: string;
  bodyText?: string;
  clientMessageId: string;
}): string {
  const headers = [
    `From: ${input.from}`,
    `To: ${input.to.join(", ")}`,
    input.cc.length > 0 ? `Cc: ${input.cc.join(", ")}` : null,
    input.bcc.length > 0 ? `Bcc: ${input.bcc.join(", ")}` : null,
    `Subject: ${input.subject}`,
    "MIME-Version: 1.0",
    input.bodyHtml
      ? 'Content-Type: text/html; charset="UTF-8"'
      : 'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 7bit",
    `X-Hypermail-Client-Message-Id: ${input.clientMessageId}`
  ].filter(Boolean);

  const mimeMessage = `${headers.join("\r\n")}\r\n\r\n${input.bodyHtml ?? input.bodyText ?? ""}`;

  return Buffer.from(mimeMessage, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function normalizeBase64Url(value: string): string {
  return value.replace(/-/g, "+").replace(/_/g, "/");
}

async function performUnsubscribeRequest(
  accessToken: string,
  accountEmail: string,
  unsubscribe: LocalMailUnsubscribe
): Promise<void> {
  switch (unsubscribe.method) {
    case "http-post":
      await performOneClickUnsubscribe(unsubscribe.endpoint);
      return;
    case "http-get":
      await performGetUnsubscribe(unsubscribe.endpoint);
      return;
    case "mailto":
      await sendMailtoUnsubscribe(accessToken, accountEmail, unsubscribe);
      return;
    default:
      throw new Error(`Unsupported unsubscribe method: ${String(unsubscribe.method)}`);
  }
}

async function performOneClickUnsubscribe(endpoint: string): Promise<void> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "List-Unsubscribe=One-Click",
    redirect: "manual"
  });

  if (!response.ok) {
    throw new Error(`One-click unsubscribe failed with ${response.status}.`);
  }
}

async function performGetUnsubscribe(endpoint: string): Promise<void> {
  const response = await fetch(endpoint, {
    method: "GET"
  });

  if (!response.ok) {
    throw new Error(`Unsubscribe request failed with ${response.status}.`);
  }
}

async function sendMailtoUnsubscribe(
  accessToken: string,
  accountEmail: string,
  unsubscribe: LocalMailUnsubscribe
): Promise<void> {
  const recipients = unsubscribe.mailto?.to ?? [];

  if (recipients.length === 0) {
    throw new Error("Mailto unsubscribe is missing a destination address.");
  }

  await gmailSendMessage(accessToken, {
    raw: encodeRawMimeMessage({
      from: accountEmail,
      to: recipients,
      cc: [],
      bcc: [],
      subject: unsubscribe.mailto?.subject ?? "unsubscribe",
      bodyText: unsubscribe.mailto?.body ?? "unsubscribe",
      clientMessageId: `hypermail-unsubscribe-${crypto.randomUUID()}`
    })
  });
}
