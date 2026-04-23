import type {
  AttachmentCacheSummary,
  DraftSummary,
  InboxSnapshot,
  LocalCachedAttachment,
  LocalMailDraft,
  PersistedModifierRecord,
  QueueSummary,
  ThreadProjection,
  ThreadSnapshot
} from "@shared/mail/models";
import { applyModifiersToThread } from "../modifiers/modifier-factory";
import { suggestLocalTriageSplit } from "../../lib/local-triage-rules";
import { hypermailDb } from "./hypermail-db";

const FOLLOW_UP_ACTION_THRESHOLD_MS = 24 * 60 * 60 * 1000;

function summarizeQueue(records: PersistedModifierRecord[]): QueueSummary {
  return records.reduce<QueueSummary>(
    (summary, record) => {
      summary.total += 1;
      summary[record.status] += 1;
      return summary;
    },
    {
      pending: 0,
      processing: 0,
      retry: 0,
      total: 0
    }
  );
}

function summarizeDrafts(records: LocalMailDraft[]): DraftSummary {
  return records.reduce<DraftSummary>(
    (summary, record) => {
      summary.total += 1;
      summary[record.status] += 1;
      return summary;
    },
    {
      draft: 0,
      queued: 0,
      sending: 0,
      failed: 0,
      total: 0
    }
  );
}

function summarizeAttachmentCache(
  records: LocalCachedAttachment[]
): AttachmentCacheSummary {
  return records.reduce<AttachmentCacheSummary>(
    (summary, record) => {
      summary.cachedItems += 1;
      summary.cachedBytes += record.size;
      return summary;
    },
    {
      cachedItems: 0,
      cachedBytes: 0
    }
  );
}

export async function loadInboxSnapshot(
  accountId: string,
  database = hypermailDb
): Promise<InboxSnapshot> {
  const startedAt = performance.now();
  const [account, threads, messages, labels, drafts, queue, attachmentCache] =
    await Promise.all([
      database.accounts.get(accountId),
      database.threads.where("accountId").equals(accountId).toArray(),
      database.messages.where("accountId").equals(accountId).toArray(),
      database.labels.where("accountId").equals(accountId).toArray(),
      database.drafts.where("accountId").equals(accountId).toArray(),
      database.queuedModifiers.where("accountId").equals(accountId).toArray(),
      database.attachmentCache.where("accountId").equals(accountId).toArray()
    ]);

  const queueByThread = new Map<string, PersistedModifierRecord[]>();
  const messagesByThread = new Map<string, typeof messages>();

  for (const message of messages) {
    const existingMessages = messagesByThread.get(message.threadId) ?? [];
    existingMessages.push(message);
    messagesByThread.set(message.threadId, existingMessages);
  }

  for (const record of queue) {
    const existingRecords = queueByThread.get(record.threadId) ?? [];
    existingRecords.push(record);
    queueByThread.set(record.threadId, existingRecords);
  }

  const projections: ThreadProjection[] = threads
    .map((thread) => {
      const baseSnapshot: ThreadSnapshot = {
        thread,
        messages: [...(messagesByThread.get(thread.id) ?? [])].sort(
          (left, right) => left.sentAt - right.sentAt
        )
      };

      const threadQueue = [...(queueByThread.get(thread.id) ?? [])].sort(
        (left, right) => left.createdAt - right.createdAt
      );
      const projected = applyModifiersToThread(baseSnapshot, threadQueue);
      const waitingSince = getWaitingSince(account?.email ?? null, projected);
      const localRule = suggestLocalTriageSplit(projected);
      const actionNeeded =
        projected.thread.unread ||
        projected.thread.split === "vip" ||
        projected.thread.split === "important" ||
        localRule?.split === "vip" ||
        localRule?.split === "important" ||
        Boolean(
          waitingSince && Date.now() - waitingSince >= FOLLOW_UP_ACTION_THRESHOLD_MS
        );

      return {
        ...projected,
        queueDepth: threadQueue.length,
        pendingModifierIds: threadQueue.map((record) => record.id),
        pendingModifierTypes: threadQueue.map((record) => record.type),
        waitingForReply: waitingSince !== null,
        waitingSince,
        actionNeeded,
        localRuleSplit: localRule?.split ?? null,
        localRuleReason: localRule?.reason ?? null
      };
    })
    .sort((left, right) => right.thread.lastMessageAt - left.thread.lastMessageAt);

  return {
    account: account ?? null,
    threads: projections,
    labels,
    drafts: [...drafts].sort((left, right) => right.updatedAt - left.updatedAt),
    draftSummary: summarizeDrafts(drafts),
    queue: [...queue].sort((left, right) => left.createdAt - right.createdAt),
    queueSummary: summarizeQueue(queue),
    attachmentCacheSummary: summarizeAttachmentCache(attachmentCache),
    performance: {
      snapshotLoadMs: Math.round((performance.now() - startedAt) * 10) / 10,
      threadCount: projections.length,
      messageCount: messages.length,
      visibleMessageCount: projections.reduce(
        (total, projection) => total + projection.messages.length,
        0
      ),
      draftCount: drafts.length,
      cachedAttachmentCount: attachmentCache.length,
      generatedAt: Date.now()
    }
  };
}

function getWaitingSince(
  accountEmail: string | null,
  snapshot: ThreadSnapshot
): number | null {
  if (!accountEmail || snapshot.thread.archived || snapshot.thread.snoozedUntil) {
    return null;
  }

  const latestMessage = snapshot.messages[snapshot.messages.length - 1] ?? null;

  if (!latestMessage) {
    return null;
  }

  if (latestMessage.fromEmail.toLowerCase() !== accountEmail.toLowerCase()) {
    return null;
  }

  if (
    latestMessage.deliveryState === "queued" ||
    latestMessage.deliveryState === "sending" ||
    latestMessage.deliveryState === "failed"
  ) {
    return null;
  }

  return latestMessage.sentAt;
}
