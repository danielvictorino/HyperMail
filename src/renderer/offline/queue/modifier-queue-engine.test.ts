import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { LocalMailUnsubscribe } from "@shared/mail/models";
import { loadInboxSnapshot } from "../db/load-inbox-snapshot";
import { HypermailDatabase } from "../db/hypermail-db";
import { SetThreadArchivedModifier } from "../modifiers/set-thread-archived-modifier";
import { SetThreadSnoozedModifier } from "../modifiers/set-thread-snoozed-modifier";
import { SetThreadStarredModifier } from "../modifiers/set-thread-starred-modifier";
import { UnsubscribeThreadModifier } from "../modifiers/unsubscribe-thread-modifier";
import { ModifierQueueEngine } from "./modifier-queue-engine";
import type { MailGateway } from "./mail-gateway";

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function waitFor(assertion: () => Promise<void>, timeoutMs = 1500) {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    try {
      await assertion();
      return;
    } catch {
      await wait(20);
    }
  }

  await assertion();
}

class TestConnectivity {
  private online = true;
  private readonly listeners = new Set<() => void>();
  lastQueueError: string | null = null;

  isOnline(): boolean {
    return this.online;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  setQueueError(message: string | null): void {
    this.lastQueueError = message;
  }

  setOnline(online: boolean): void {
    this.online = online;
    this.listeners.forEach((listener) => listener());
  }
}

class TestGateway implements MailGateway {
  readonly operations: string[] = [];

  async setThreadStarred(input: {
    accountId: string;
    threadId: string;
    starred: boolean;
    idempotencyKey: string;
  }): Promise<void> {
    this.operations.push(`star:${input.starred}`);
  }

  async setThreadArchived(input: {
    accountId: string;
    threadId: string;
    archived: boolean;
    idempotencyKey: string;
  }): Promise<void> {
    this.operations.push(`archive:${input.archived}`);
  }

  async setThreadSnoozed(input: {
    accountId: string;
    threadId: string;
    snoozedUntil: number | null;
    idempotencyKey: string;
  }): Promise<void> {
    this.operations.push(`snooze:${input.snoozedUntil ?? "none"}`);
  }

  async unsubscribeThread(input: {
    accountId: string;
    threadId: string;
    unsubscribe: LocalMailUnsubscribe;
    idempotencyKey: string;
  }): Promise<void> {
    this.operations.push(`unsubscribe:${input.unsubscribe.method}`);
  }

  async sendDraft(input: {
    accountId: string;
    draftId: string;
    threadId: string;
    clientMessageId: string;
    to: string[];
    cc: string[];
    bcc: string[];
    subject: string;
    bodyHtml: string;
    replyToMessageId?: string;
    sendAt?: number | null;
  }): Promise<{ remoteMessageId?: string; sentAt: number }> {
    this.operations.push(`send:${input.draftId}`);
    return {
      remoteMessageId: `remote:${input.draftId}`,
      sentAt: Date.now()
    };
  }
}

describe("ModifierQueueEngine", () => {
  const accountId = "account-queue-test";
  const threadId = "thread-queue-test";
  let database: HypermailDatabase;
  let connectivity: TestConnectivity;
  let gateway: TestGateway;
  let engine: ModifierQueueEngine;

  beforeEach(async () => {
    database = new HypermailDatabase(`hypermail-test-${crypto.randomUUID()}`);
    connectivity = new TestConnectivity();
    gateway = new TestGateway();
    engine = new ModifierQueueEngine(database, gateway, connectivity);

    await database.accounts.put({
      id: accountId,
      email: "queue@test.dev",
      displayName: "Queue Test",
      provider: "demo",
      connectedAt: Date.now(),
      updatedAt: Date.now()
    });

    await database.threads.put({
      id: threadId,
      accountId,
      subject: "Queue engine",
      snippet: "Queue engine seed thread",
      participantNames: ["Queue Test"],
      participantEmails: ["queue@test.dev"],
      split: "important",
      unread: true,
      starred: false,
      archived: false,
      snoozedUntil: null,
      unsubscribe: null,
      unsubscribedAt: null,
      lastMessageAt: Date.now(),
      messageIds: ["message-queue-1"],
      updatedAt: Date.now()
    });

    await database.messages.put({
      id: "message-queue-1",
      accountId,
      threadId,
      subject: "Queue engine",
      fromName: "Queue Test",
      fromEmail: "queue@test.dev",
      to: ["alex@example.com"],
      cc: [],
      bodyPlain: "Local cache should stay deterministic.",
      unread: true,
      starred: false,
      archived: false,
      labelIds: ["INBOX"],
      attachments: [],
      deliveryState: "sent",
      sentAt: Date.now()
    });

    engine.start();
  });

  afterEach(async () => {
    engine.stop();
    await database.delete();
  });

  it("persists same-thread modifiers in order", async () => {
    await engine.enqueue(
      SetThreadStarredModifier.create(accountId, threadId, true).toRecord()
    );
    await engine.enqueue(
      SetThreadStarredModifier.create(accountId, threadId, false).toRecord()
    );

    await waitFor(async () => {
      expect(await database.queuedModifiers.count()).toBe(0);
    });

    const thread = await database.threads.get(threadId);

    expect(gateway.operations).toEqual(["star:true", "star:false"]);
    expect(thread?.starred).toBe(false);
  });

  it("holds modifiers locally while offline and commits them after reconnect", async () => {
    connectivity.setOnline(false);

    await engine.enqueue(
      SetThreadArchivedModifier.create(accountId, threadId, true).toRecord()
    );
    await engine.kick();

    const projectedSnapshot = await loadInboxSnapshot(accountId, database);
    const baseThread = await database.threads.get(threadId);

    expect(projectedSnapshot.threads[0]?.thread.archived).toBe(true);
    expect(baseThread?.archived).toBe(false);
    expect(await database.queuedModifiers.count()).toBe(1);

    connectivity.setOnline(true);

    await waitFor(async () => {
      expect(await database.queuedModifiers.count()).toBe(0);
    });

    const committedThread = await database.threads.get(threadId);

    expect(gateway.operations).toContain("archive:true");
    expect(committedThread?.archived).toBe(true);
  });

  it("commits snooze modifiers after reconnect", async () => {
    const snoozedUntil = Date.now() + 2 * 60 * 60 * 1000;
    connectivity.setOnline(false);

    await engine.enqueue(
      SetThreadSnoozedModifier.create(accountId, threadId, snoozedUntil).toRecord()
    );
    await engine.kick();

    const projectedSnapshot = await loadInboxSnapshot(accountId, database);
    expect(projectedSnapshot.threads[0]?.thread.snoozedUntil).toBe(snoozedUntil);

    connectivity.setOnline(true);

    await waitFor(async () => {
      expect(await database.queuedModifiers.count()).toBe(0);
    });

    const committedThread = await database.threads.get(threadId);

    expect(gateway.operations).toContain(`snooze:${snoozedUntil}`);
    expect(committedThread?.snoozedUntil).toBe(snoozedUntil);
  });

  it("commits unsubscribe modifiers after reconnect", async () => {
    connectivity.setOnline(false);

    await engine.enqueue(
      UnsubscribeThreadModifier.create(accountId, threadId, {
        method: "mailto",
        endpoint: "mailto:unsubscribe@example.com?subject=unsubscribe",
        oneClick: false,
        sourceMessageId: "message-queue-1",
        mailto: {
          to: ["unsubscribe@example.com"],
          subject: "unsubscribe"
        }
      }).toRecord()
    );
    await engine.kick();

    const projectedSnapshot = await loadInboxSnapshot(accountId, database);
    expect(projectedSnapshot.threads[0]?.thread.archived).toBe(true);
    expect(projectedSnapshot.threads[0]?.thread.unsubscribedAt).toBeTypeOf("number");

    connectivity.setOnline(true);

    await waitFor(async () => {
      expect(await database.queuedModifiers.count()).toBe(0);
    });

    const committedThread = await database.threads.get(threadId);

    expect(gateway.operations).toContain("unsubscribe:mailto");
    expect(committedThread?.archived).toBe(true);
    expect(committedThread?.unsubscribedAt).toBeTypeOf("number");
  });
});
