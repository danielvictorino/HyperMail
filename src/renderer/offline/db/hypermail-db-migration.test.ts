import "fake-indexeddb/auto";

import Dexie from "dexie";
import { afterEach, describe, expect, it } from "vitest";
import { HypermailDatabase } from "./hypermail-db";

/**
 * Constructs a Dexie database seeded to the v1 schema (pre-attachment-cache,
 * pre-snoozed fields). Uses a throwaway Dexie subclass so we can write rows
 * with the old shape and then reopen with the real HypermailDatabase to
 * trigger v1 -> v2 -> v3 upgrades.
 */
class V1Database extends Dexie {
  accounts!: Dexie.Table<{ id: string; email: string; provider: string; updatedAt: number }, string>;
  threads!: Dexie.Table<Record<string, unknown>, string>;
  messages!: Dexie.Table<Record<string, unknown>, string>;
  labels!: Dexie.Table<Record<string, unknown>, string>;
  drafts!: Dexie.Table<Record<string, unknown>, string>;
  queuedModifiers!: Dexie.Table<Record<string, unknown>, string>;
  metadata!: Dexie.Table<Record<string, unknown>, string>;

  constructor(name: string) {
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
  }
}

describe("hypermail-db migration v1 -> v3", () => {
  const dbName = `hypermail-migration-${crypto.randomUUID()}`;

  afterEach(async () => {
    await Dexie.delete(dbName);
  });

  it("backfills snoozedUntil and unsubscribedAt on v3 upgrade", async () => {
    const v1 = new V1Database(dbName);
    await v1.threads.bulkPut([
      {
        id: "t1",
        accountId: "a",
        subject: "legacy thread without snooze fields",
        snippet: "",
        participantNames: [],
        participantEmails: [],
        split: "important",
        unread: true,
        starred: false,
        archived: false,
        unsubscribe: null,
        lastMessageAt: 1,
        messageIds: [],
        updatedAt: 1
      },
      {
        id: "t2",
        accountId: "a",
        subject: "another legacy thread",
        snippet: "",
        participantNames: [],
        participantEmails: [],
        split: "other",
        unread: false,
        starred: true,
        archived: false,
        unsubscribe: null,
        lastMessageAt: 2,
        messageIds: [],
        updatedAt: 2
      }
    ]);
    expect(await v1.verno).toBe(1);
    await v1.close();

    const upgraded = new HypermailDatabase(dbName);
    await upgraded.open();
    expect(upgraded.verno).toBe(3);

    const threads = await upgraded.threads.toArray();
    expect(threads).toHaveLength(2);
    for (const thread of threads) {
      expect(thread.snoozedUntil).toBe(null);
      expect(thread.unsubscribedAt).toBe(null);
    }

    await upgraded.close();
  });

  it("preserves row data across the full v1 -> v3 upgrade", async () => {
    const v1 = new V1Database(dbName);
    await v1.accounts.put({
      id: "acc",
      email: "daniel@example.com",
      provider: "google",
      updatedAt: 42
    });
    await v1.queuedModifiers.put({
      id: "mod-1",
      type: "set-thread-starred",
      aggregateKey: "agg",
      accountId: "acc",
      threadId: "t1",
      payload: { accountId: "acc", threadId: "t1", starred: true },
      status: "pending",
      attempts: 0,
      createdAt: 1,
      updatedAt: 1,
      nextAttemptAt: 0,
      idempotencyKey: "k1"
    });
    await v1.close();

    const upgraded = new HypermailDatabase(dbName);
    await upgraded.open();

    const account = await upgraded.accounts.get("acc");
    expect(account?.email).toBe("daniel@example.com");

    const mod = await upgraded.queuedModifiers.get("mod-1");
    expect(mod?.status).toBe("pending");
    expect(mod?.idempotencyKey).toBe("k1");

    await upgraded.close();
  });
});
