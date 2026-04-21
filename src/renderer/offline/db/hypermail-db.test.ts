import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { HypermailDatabase, deleteAccountCascade } from "./hypermail-db";

describe("deleteAccountCascade", () => {
  let database: HypermailDatabase;

  beforeEach(() => {
    database = new HypermailDatabase(`hypermail-cascade-${crypto.randomUUID()}`);
  });

  afterEach(async () => {
    await database.delete();
  });

  it("removes the account and all account-scoped records", async () => {
    const keepAccountId = "google:keep@example.com";
    const purgeAccountId = "google:purge@example.com";

    await database.accounts.bulkPut([
      {
        id: keepAccountId,
        email: "keep@example.com",
        displayName: "Keep",
        provider: "google",
        connectedAt: 1,
        updatedAt: 1
      },
      {
        id: purgeAccountId,
        email: "purge@example.com",
        displayName: "Purge",
        provider: "google",
        connectedAt: 1,
        updatedAt: 1
      }
    ]);

    await database.threads.bulkPut([
      {
        id: `${keepAccountId}:thread:1`,
        accountId: keepAccountId,
        subject: "keep",
        snippet: "",
        participantNames: [],
        participantEmails: [],
        split: "important",
        unread: false,
        starred: false,
        archived: false,
        snoozedUntil: null,
        unsubscribe: null,
        unsubscribedAt: null,
        lastMessageAt: 1,
        messageIds: [],
        updatedAt: 1
      },
      {
        id: `${purgeAccountId}:thread:1`,
        accountId: purgeAccountId,
        subject: "purge",
        snippet: "",
        participantNames: [],
        participantEmails: [],
        split: "important",
        unread: false,
        starred: false,
        archived: false,
        snoozedUntil: null,
        unsubscribe: null,
        unsubscribedAt: null,
        lastMessageAt: 1,
        messageIds: [],
        updatedAt: 1
      }
    ]);

    await database.messages.put({
      id: `${purgeAccountId}:msg:1`,
      accountId: purgeAccountId,
      threadId: `${purgeAccountId}:thread:1`,
      subject: "",
      fromName: "",
      fromEmail: "",
      to: [],
      cc: [],
      bodyPlain: "",
      unread: false,
      starred: false,
      archived: false,
      labelIds: [],
      attachments: [],
      sentAt: 1
    });

    await database.queuedModifiers.put({
      id: "mod:1",
      type: "set-thread-starred",
      aggregateKey: "a",
      accountId: purgeAccountId,
      threadId: `${purgeAccountId}:thread:1`,
      payload: {
        accountId: purgeAccountId,
        threadId: `${purgeAccountId}:thread:1`,
        starred: true
      },
      status: "pending",
      attempts: 0,
      createdAt: 1,
      updatedAt: 1,
      nextAttemptAt: 1,
      idempotencyKey: "k"
    });

    await deleteAccountCascade(database, purgeAccountId);

    expect(await database.accounts.get(purgeAccountId)).toBeUndefined();
    expect(await database.accounts.get(keepAccountId)).toBeDefined();
    expect(
      await database.threads.where("accountId").equals(purgeAccountId).count()
    ).toBe(0);
    expect(
      await database.messages.where("accountId").equals(purgeAccountId).count()
    ).toBe(0);
    expect(
      await database.queuedModifiers.where("accountId").equals(purgeAccountId).count()
    ).toBe(0);
    expect(
      await database.threads.where("accountId").equals(keepAccountId).count()
    ).toBe(1);
  });
});
