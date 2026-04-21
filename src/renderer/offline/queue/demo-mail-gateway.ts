import type { LocalMailUnsubscribe } from "@shared/mail/models";
import { OfflineQueueError, type MailGateway } from "./mail-gateway";

interface ConnectivityReader {
  isOnline(): boolean;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, ms);
  });
}

export class DemoMailGateway implements MailGateway {
  private readonly completedIdempotencyKeys = new Set<string>();

  constructor(private readonly connectivity: ConnectivityReader) {}

  async setThreadStarred(input: {
    accountId: string;
    threadId: string;
    starred: boolean;
    idempotencyKey: string;
  }): Promise<void> {
    await this.simulateRequest(input.idempotencyKey);
  }

  async setThreadArchived(input: {
    accountId: string;
    threadId: string;
    archived: boolean;
    idempotencyKey: string;
  }): Promise<void> {
    await this.simulateRequest(input.idempotencyKey);
  }

  async setThreadSnoozed(input: {
    accountId: string;
    threadId: string;
    snoozedUntil: number | null;
    idempotencyKey: string;
  }): Promise<void> {
    await this.simulateRequest(input.idempotencyKey);
  }

  async unsubscribeThread(input: {
    accountId: string;
    threadId: string;
    unsubscribe: LocalMailUnsubscribe;
    idempotencyKey: string;
  }): Promise<void> {
    await this.simulateRequest(input.idempotencyKey);
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
    await this.simulateRequest(input.draftId);

    return {
      remoteMessageId: `demo-sent:${input.draftId}`,
      sentAt: Date.now()
    };
  }

  private async simulateRequest(idempotencyKey: string): Promise<void> {
    if (this.completedIdempotencyKeys.has(idempotencyKey)) {
      return;
    }

    if (!this.connectivity.isOnline()) {
      throw new OfflineQueueError();
    }

    await delay(180);

    if (!this.connectivity.isOnline()) {
      throw new OfflineQueueError();
    }

    this.completedIdempotencyKeys.add(idempotencyKey);
  }
}
