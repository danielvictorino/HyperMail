import type { MailAccountDescriptor, ThreadProjection } from "@shared/mail/models";
import {
  getDraftForThread,
  queueDraftForDelivery,
  saveDraftForThread
} from "../offline/outbox/draft-service";
import { outboxEngine } from "../offline/runtime";

export interface MailboxComposerActions {
  loadDraft: (thread: ThreadProjection) => Promise<string | null>;
  saveDraft: (thread: ThreadProjection, bodyHtml: string) => Promise<void>;
  queueReply: (thread: ThreadProjection, bodyHtml: string) => Promise<void>;
  queueReplyAt: (
    thread: ThreadProjection,
    bodyHtml: string,
    sendAt: number
  ) => Promise<void>;
  queueReplyLater: (thread: ThreadProjection, bodyHtml: string) => Promise<void>;
}

interface UseMailboxComposerActionsOptions {
  account: MailAccountDescriptor;
}

export function useMailboxComposerActions({
  account
}: UseMailboxComposerActionsOptions): MailboxComposerActions {
  async function loadDraft(thread: ThreadProjection): Promise<string | null> {
    const draft = await getDraftForThread(account.id, thread.thread.id);
    return draft?.bodyHtml ?? null;
  }

  async function saveDraft(thread: ThreadProjection, bodyHtml: string): Promise<void> {
    await saveDraftForThread(thread, bodyHtml);
  }

  async function queueReply(thread: ThreadProjection, bodyHtml: string): Promise<void> {
    await queueDraftForDelivery(thread, bodyHtml, null);
    await outboxEngine.kick();
  }

  async function queueReplyAt(
    thread: ThreadProjection,
    bodyHtml: string,
    sendAt: number
  ): Promise<void> {
    await queueDraftForDelivery(thread, bodyHtml, sendAt);
  }

  async function queueReplyLater(
    thread: ThreadProjection,
    bodyHtml: string
  ): Promise<void> {
    await queueReplyAt(thread, bodyHtml, Date.now() + 60 * 60 * 1000);
  }

  return {
    loadDraft,
    saveDraft,
    queueReply,
    queueReplyAt,
    queueReplyLater
  };
}
