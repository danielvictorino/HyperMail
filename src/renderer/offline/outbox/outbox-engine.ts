import type { LocalMailDraft } from "@shared/mail/models";
import type { HypermailDatabase } from "../db/hypermail-db";
import type { MailGateway } from "../queue/mail-gateway";
import { markDraftDelivered, markDraftFailed, markDraftSending } from "./draft-service";

interface ConnectivityController {
  isOnline(): boolean;
  subscribe(listener: () => void): () => void;
  setQueueError(message: string | null): void;
}

export class OutboxEngine {
  private readonly inFlightDrafts = new Set<string>();
  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private unsubscribeConnectivity: (() => void) | null = null;

  constructor(
    private readonly database: HypermailDatabase,
    private readonly gateway: MailGateway,
    private readonly connectivity: ConnectivityController
  ) {}

  start(): void {
    if (this.intervalHandle) {
      return;
    }

    this.unsubscribeConnectivity = this.connectivity.subscribe(() => {
      void this.kick();
    });

    this.intervalHandle = globalThis.setInterval(() => {
      void this.kick();
    }, 1500);

    void this.kick();
  }

  stop(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }

    this.unsubscribeConnectivity?.();
    this.unsubscribeConnectivity = null;
  }

  async kick(): Promise<void> {
    if (!this.connectivity.isOnline()) {
      return;
    }

    const now = Date.now();
    const drafts = await this.database.drafts
      .where("status")
      .anyOf("queued", "sending")
      .toArray();

    const readyDrafts = drafts
      .filter(
        (draft) =>
          !this.inFlightDrafts.has(draft.id) &&
          (draft.sendAt === null || draft.sendAt <= now)
      )
      .sort((left, right) => left.updatedAt - right.updatedAt);

    await Promise.all(readyDrafts.map((draft) => this.processDraft(draft)));
  }

  private async processDraft(draft: LocalMailDraft): Promise<void> {
    this.inFlightDrafts.add(draft.id);

    try {
      await markDraftSending(draft.id, this.database);

      const result = await this.gateway.sendDraft({
        accountId: draft.accountId,
        draftId: draft.id,
        threadId: draft.threadId ?? "",
        clientMessageId: draft.clientMessageId,
        to: draft.to,
        cc: draft.cc,
        bcc: draft.bcc,
        subject: draft.subject,
        bodyHtml: draft.bodyHtml,
        replyToMessageId: draft.replyToMessageId,
        sendAt: draft.sendAt
      });

      await markDraftDelivered(draft, result.sentAt, this.database);
      this.connectivity.setQueueError(null);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "HyperMail could not deliver the queued reply.";
      await markDraftFailed(draft, message, this.database);
      this.connectivity.setQueueError(message);
    } finally {
      this.inFlightDrafts.delete(draft.id);
    }
  }
}
