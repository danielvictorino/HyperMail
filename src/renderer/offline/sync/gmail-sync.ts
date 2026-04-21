import type { GmailMailboxSyncPayload } from "@shared/contracts";
import { getDesktopApi } from "@/lib/desktop-api";
import { hypermailDb, type HypermailDatabase } from "../db/hypermail-db";

const GMAIL_HISTORY_KEY_PREFIX = "gmail-history-id:";
const GMAIL_SYNCED_AT_KEY_PREFIX = "gmail-synced-at:";
const GMAIL_SYNC_STATS_KEY_PREFIX = "gmail-sync-stats:";

function getHistoryKey(accountId: string): string {
  return `${GMAIL_HISTORY_KEY_PREFIX}${accountId}`;
}

function getSyncedAtKey(accountId: string): string {
  return `${GMAIL_SYNCED_AT_KEY_PREFIX}${accountId}`;
}

function getSyncStatsKey(accountId: string): string {
  return `${GMAIL_SYNC_STATS_KEY_PREFIX}${accountId}`;
}

export interface GmailSyncTelemetry {
  durationMs: number;
  threadCount: number;
  mode: GmailMailboxSyncPayload["mode"];
  recoveryReason: GmailMailboxSyncPayload["recoveryReason"];
  removedThreadCount: number;
}

export async function getGmailHistoryId(
  accountId: string,
  database = hypermailDb
): Promise<string | null> {
  const record = await database.metadata.get(getHistoryKey(accountId));
  return record?.value ?? null;
}

export async function getLastGmailSyncedAt(
  accountId: string,
  database = hypermailDb
): Promise<number | null> {
  const record = await database.metadata.get(getSyncedAtKey(accountId));

  if (!record) {
    return null;
  }

  const value = Number.parseInt(record.value, 10);
  return Number.isFinite(value) ? value : null;
}

export async function syncGmailAccount(
  accountId: string,
  database = hypermailDb
): Promise<GmailMailboxSyncPayload> {
  const startedAt = performance.now();
  const historyId = await getGmailHistoryId(accountId, database);
  const payload = await getDesktopApi().mail.syncGmailMailbox({
    accountId,
    historyId
  });

  await applyGmailSyncPayload(payload, database);
  await database.metadata.put({
    key: getSyncStatsKey(accountId),
      value: JSON.stringify({
        durationMs: Math.round(performance.now() - startedAt),
        threadCount: payload.threadSnapshots.length,
        mode: payload.mode,
        recoveryReason: payload.recoveryReason,
        removedThreadCount: payload.removedThreadIds.length
      } satisfies GmailSyncTelemetry),
    updatedAt: payload.syncedAt
  });
  return payload;
}

export async function getGmailSyncTelemetry(
  accountId: string,
  database = hypermailDb
): Promise<GmailSyncTelemetry | null> {
  const record = await database.metadata.get(getSyncStatsKey(accountId));

  if (!record) {
    return null;
  }

  try {
    return JSON.parse(record.value) as GmailSyncTelemetry;
  } catch {
    return null;
  }
}

export async function applyGmailSyncPayload(
  payload: GmailMailboxSyncPayload,
  database = hypermailDb
): Promise<void> {
  await database.transaction(
    "rw",
    database.tables,
    async () => {
      await database.accounts.put(payload.account);
      await replaceLabels(payload.account.id, payload.labels, database);

      if (payload.mode === "full") {
        await deleteStaleThreads(payload.account.id, payload.activeThreadIds, database);
      }

      if (payload.removedThreadIds.length > 0) {
        await deleteThreads(payload.removedThreadIds, database);
      }

      for (const snapshot of payload.threadSnapshots) {
        await upsertThreadSnapshot(snapshot, database);
      }

      await database.metadata.bulkPut([
        {
          key: getHistoryKey(payload.account.id),
          value: payload.historyId,
          updatedAt: payload.syncedAt
        },
        {
          key: getSyncedAtKey(payload.account.id),
          value: String(payload.syncedAt),
          updatedAt: payload.syncedAt
        }
      ]);
    }
  );
}

async function replaceLabels(
  accountId: string,
  labels: GmailMailboxSyncPayload["labels"],
  database: HypermailDatabase
): Promise<void> {
  const existingLabelIds = (await database.labels
    .where("accountId")
    .equals(accountId)
    .primaryKeys()) as string[];
  const nextLabelIds = new Set(labels.map((label) => label.id));
  const staleLabelIds = existingLabelIds.filter((labelId) => !nextLabelIds.has(labelId));

  if (staleLabelIds.length > 0) {
    await database.labels.bulkDelete(staleLabelIds);
  }

  if (labels.length > 0) {
    await database.labels.bulkPut(labels);
  }
}

async function deleteStaleThreads(
  accountId: string,
  activeThreadIds: string[],
  database: HypermailDatabase
): Promise<void> {
  const existingThreadIds = (await database.threads
    .where("accountId")
    .equals(accountId)
    .primaryKeys()) as string[];
  const activeThreadIdSet = new Set(activeThreadIds);
  const staleThreadIds = existingThreadIds.filter(
    (threadId) => !activeThreadIdSet.has(threadId)
  );

  await deleteThreads(staleThreadIds, database);
}

async function deleteThreads(
  threadIds: string[],
  database: HypermailDatabase
): Promise<void> {
  if (threadIds.length === 0) {
    return;
  }

  const messageIds = (await database.messages
    .where("threadId")
    .anyOf(threadIds)
    .primaryKeys()) as string[];
  const attachmentCacheIds = (await database.attachmentCache
    .where("threadId")
    .anyOf(threadIds)
    .primaryKeys()) as string[];
  const queuedModifierIds = (await database.queuedModifiers
    .where("threadId")
    .anyOf(threadIds)
    .primaryKeys()) as string[];

  if (messageIds.length > 0) {
    await database.messages.bulkDelete(messageIds);
  }

  if (attachmentCacheIds.length > 0) {
    await database.attachmentCache.bulkDelete(attachmentCacheIds);
  }

  if (queuedModifierIds.length > 0) {
    await database.queuedModifiers.bulkDelete(queuedModifierIds);
  }

  await database.threads.bulkDelete(threadIds);
}

async function upsertThreadSnapshot(
  snapshot: GmailMailboxSyncPayload["threadSnapshots"][number],
  database: HypermailDatabase
): Promise<void> {
  const [existingThread, existingMessages, cachedAttachments] = await Promise.all([
    database.threads.get(snapshot.thread.id),
    database.messages.where("threadId").equals(snapshot.thread.id).toArray(),
    database.attachmentCache.where("threadId").equals(snapshot.thread.id).toArray()
  ]);
  const existingMessageIds = existingMessages.map((message) => message.id);
  const nextMessageIds = new Set(snapshot.messages.map((message) => message.id));
  const staleMessageIds = existingMessageIds.filter(
    (messageId) => !nextMessageIds.has(messageId)
  );
  const nextCachedAttachmentKeys = new Set(
    snapshot.messages.flatMap((message) =>
      message.attachments
        .filter((attachment) => Boolean(attachment.attachmentId))
        .map((attachment) => `${message.id}:${attachment.attachmentId}`)
    )
  );
  const cachedAttachmentIds = new Set(
    cachedAttachments.map((attachment) => attachment.attachmentId)
  );
  const staleAttachmentCacheIds = cachedAttachments
    .filter((attachment) => {
      if (staleMessageIds.includes(attachment.messageId)) {
        return true;
      }

      return !nextCachedAttachmentKeys.has(
        `${attachment.messageId}:${attachment.attachmentId}`
      );
    })
    .map((attachment) => attachment.id);
  const nextMessages = snapshot.messages.map((message) => ({
    ...message,
    attachments: message.attachments.map((attachment) => ({
      ...attachment,
      cacheState:
        attachment.attachmentId &&
        cachedAttachmentIds.has(attachment.attachmentId)
          ? "cached"
          : attachment.cacheState
    }))
  }));

  if (staleMessageIds.length > 0) {
    await database.messages.bulkDelete(staleMessageIds);
  }

  if (staleAttachmentCacheIds.length > 0) {
    await database.attachmentCache.bulkDelete(staleAttachmentCacheIds);
  }

  await database.threads.put({
    ...snapshot.thread,
    // Preserve local-first snooze state while Gmail remains label-based for thread mutations.
    snoozedUntil:
      existingThread?.snoozedUntil && existingThread.snoozedUntil > Date.now()
        ? existingThread.snoozedUntil
        : null,
    unsubscribe: snapshot.thread.unsubscribe ?? existingThread?.unsubscribe ?? null,
    unsubscribedAt: existingThread?.unsubscribedAt ?? snapshot.thread.unsubscribedAt
  });

  if (nextMessages.length > 0) {
    await database.messages.bulkPut(nextMessages);
  }
}
