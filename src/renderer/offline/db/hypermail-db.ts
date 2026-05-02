import Dexie, { type Transaction, type Table } from "dexie";
import type {
  LocalMailAccount,
  LocalCachedAttachment,
  LocalMailDraft,
  LocalMailLabel,
  LocalMailMessage,
  LocalMailThread,
  LocalMetadataRecord,
  PersistedModifierRecord,
  ThreadSnapshot
} from "@shared/mail/models";

const ASSISTANT_SUMMARY_METADATA_PREFIX = "assistant:summary:";
const ASSISTANT_SPLIT_METADATA_PREFIX = "assistant:split:";

export class HypermailDatabase extends Dexie {
  accounts!: Table<LocalMailAccount, string>;
  threads!: Table<LocalMailThread, string>;
  messages!: Table<LocalMailMessage, string>;
  labels!: Table<LocalMailLabel, string>;
  drafts!: Table<LocalMailDraft, string>;
  attachmentCache!: Table<LocalCachedAttachment, string>;
  queuedModifiers!: Table<PersistedModifierRecord, string>;
  metadata!: Table<LocalMetadataRecord, string>;

  constructor(name = "hypermail") {
    super(name);

    this.version(1).stores({
      accounts: "id, email, provider, updatedAt",
      threads:
        "id, accountId, lastMessageAt, updatedAt, unread, starred, archived, split, [accountId+lastMessageAt]",
      messages: "id, accountId, threadId, sentAt, [threadId+sentAt]",
      labels: "id, accountId, kind, name",
      drafts: "id, accountId, threadId, updatedAt",
      queuedModifiers:
        "id, aggregateKey, accountId, threadId, createdAt, updatedAt, status, nextAttemptAt, [aggregateKey+createdAt], [status+nextAttemptAt]",
      metadata: "key, updatedAt"
    });

    this.version(2).stores({
      accounts: "id, email, provider, updatedAt",
      threads:
        "id, accountId, lastMessageAt, updatedAt, unread, starred, archived, split, [accountId+lastMessageAt]",
      messages: "id, accountId, threadId, sentAt, [threadId+sentAt]",
      labels: "id, accountId, kind, name",
      drafts:
        "id, accountId, threadId, updatedAt, status, sendAt, [status+sendAt], [accountId+updatedAt]",
      attachmentCache: "id, accountId, messageId, threadId, updatedAt",
      queuedModifiers:
        "id, aggregateKey, accountId, threadId, createdAt, updatedAt, status, nextAttemptAt, [aggregateKey+createdAt], [status+nextAttemptAt]",
      metadata: "key, updatedAt"
    });

    this.version(3)
      .stores({
        accounts: "id, email, provider, updatedAt",
        threads:
          "id, accountId, lastMessageAt, updatedAt, unread, starred, archived, snoozedUntil, split, [accountId+lastMessageAt]",
        messages: "id, accountId, threadId, sentAt, [threadId+sentAt]",
        labels: "id, accountId, kind, name",
        drafts:
          "id, accountId, threadId, updatedAt, status, sendAt, [status+sendAt], [accountId+updatedAt]",
        attachmentCache: "id, accountId, messageId, threadId, updatedAt",
        queuedModifiers:
          "id, aggregateKey, accountId, threadId, createdAt, updatedAt, status, nextAttemptAt, [aggregateKey+createdAt], [status+nextAttemptAt]",
        metadata: "key, updatedAt"
      })
      .upgrade(async (tx) => {
        await tx
          .table<LocalMailThread>("threads")
          .toCollection()
          .modify((thread) => {
            if (
              thread.snoozedUntil === undefined ||
              Number.isNaN(thread.snoozedUntil as unknown as number)
            ) {
              thread.snoozedUntil = null;
            }
            if (thread.unsubscribedAt === undefined) {
              thread.unsubscribedAt = null;
            }
          });
      });
  }
}

export async function deleteAccountCascade(
  database: HypermailDatabase,
  accountId: string
): Promise<void> {
  await database.transaction(
    "rw",
    [
      database.accounts,
      database.threads,
      database.messages,
      database.labels,
      database.drafts,
      database.attachmentCache,
      database.queuedModifiers,
      database.metadata
    ],
    async () => {
      await database.accounts.delete(accountId);
      await database.threads.where("accountId").equals(accountId).delete();
      await database.messages.where("accountId").equals(accountId).delete();
      await database.labels.where("accountId").equals(accountId).delete();
      await database.drafts.where("accountId").equals(accountId).delete();
      await database.attachmentCache.where("accountId").equals(accountId).delete();
      await database.queuedModifiers.where("accountId").equals(accountId).delete();
      await database.metadata
        .where("key")
        .startsWith(`${ASSISTANT_SUMMARY_METADATA_PREFIX}${accountId}:`)
        .delete();
      await database.metadata
        .where("key")
        .startsWith(`${ASSISTANT_SPLIT_METADATA_PREFIX}${accountId}:`)
        .delete();
    }
  );
}

export const hypermailDb = new HypermailDatabase();

export async function loadThreadSnapshot(
  database: HypermailDatabase,
  threadId: string
): Promise<ThreadSnapshot | null> {
  const [thread, messages] = await Promise.all([
    database.threads.get(threadId),
    database.messages.where("threadId").equals(threadId).sortBy("sentAt")
  ]);

  if (!thread) {
    return null;
  }

  return {
    thread,
    messages
  };
}

export async function writeThreadSnapshot(
  database: HypermailDatabase,
  snapshot: ThreadSnapshot,
  tx?: Transaction
): Promise<void> {
  const executor = async () => {
    await database.threads.put(snapshot.thread);
    await database.messages.bulkPut(snapshot.messages);
  };

  if (tx || Dexie.currentTransaction) {
    await executor();
    return;
  }

  await database.transaction("rw", database.threads, database.messages, executor);
}
