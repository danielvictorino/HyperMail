import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { MailGateway } from "../queue/mail-gateway";
import { HypermailDatabase } from "../db/hypermail-db";
import { loadInboxSnapshot } from "../db/load-inbox-snapshot";
import { queueDraftForDelivery } from "./draft-service";
import { OutboxEngine } from "./outbox-engine";

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
  readonly sentDrafts: string[] = [];

  async setThreadStarred(): Promise<void> {}

  async setThreadArchived(): Promise<void> {}

  async setThreadSnoozed(): Promise<void> {}

  async unsubscribeThread(): Promise<void> {}

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
    this.sentDrafts.push(input.draftId);
    return {
      remoteMessageId: `remote-${input.draftId}`,
      sentAt: Date.now()
    };
  }
}

describe("OutboxEngine", () => {
  const accountId = "demo:outbox-test";
  const threadId = `${accountId}:thread:reply`;
  let database: HypermailDatabase;
  let connectivity: TestConnectivity;
  let gateway: TestGateway;
  let engine: OutboxEngine;

  beforeEach(async () => {
    database = new HypermailDatabase(`hypermail-outbox-test-${crypto.randomUUID()}`);
    connectivity = new TestConnectivity();
    gateway = new TestGateway();
    engine = new OutboxEngine(database, gateway, connectivity);

    await database.accounts.put({
      id: accountId,
      email: "alex@example.com",
      displayName: "Alex",
      provider: "demo",
      connectedAt: Date.now(),
      updatedAt: Date.now()
    });

    await database.threads.put({
      id: threadId,
      accountId,
      subject: "Reply foundation",
      snippet: "Initial thread",
      participantNames: ["Maya Chen", "Alex"],
      participantEmails: ["maya@example.com", "alex@example.com"],
      split: "important",
      unread: true,
      starred: false,
      archived: false,
      snoozedUntil: null,
      unsubscribe: null,
      unsubscribedAt: null,
      lastMessageAt: Date.now(),
      messageIds: ["message-base"],
      updatedAt: Date.now()
    });

    await database.messages.put({
      id: "message-base",
      accountId,
      threadId,
      subject: "Reply foundation",
      fromName: "Maya Chen",
      fromEmail: "maya@example.com",
      to: ["alex@example.com"],
      cc: [],
      bodyPlain: "Can you send the updated narrative?",
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

  it("holds queued replies offline and delivers them after reconnect", async () => {
    connectivity.setOnline(false);

    const snapshot = await loadInboxSnapshot(accountId, database);
    const thread = snapshot.threads[0];

    if (!thread) {
      throw new Error("Expected seeded thread.");
    }

    await queueDraftForDelivery(
      thread,
      "<p>Yes. I’ll send it over in the next ten minutes.</p>",
      null,
      database
    );

    const queuedSnapshot = await loadInboxSnapshot(accountId, database);

    expect(queuedSnapshot.draftSummary.queued).toBe(1);
    expect(queuedSnapshot.threads[0]?.messages.at(-1)?.deliveryState).toBe("queued");

    connectivity.setOnline(true);

    await waitFor(async () => {
      expect(await database.drafts.count()).toBe(0);
    });

    const deliveredSnapshot = await loadInboxSnapshot(accountId, database);

    expect(gateway.sentDrafts).toHaveLength(1);
    expect(deliveredSnapshot.threads[0]?.messages.at(-1)?.deliveryState).toBe("sent");
  });
});
