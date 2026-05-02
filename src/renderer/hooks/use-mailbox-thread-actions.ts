import type { MailAccountDescriptor, ThreadProjection } from "@shared/mail/models";
import { getDefaultSnoozeTimestamp } from "../lib/send-later";
import { SetThreadArchivedModifier } from "../offline/modifiers/set-thread-archived-modifier";
import { SetThreadSnoozedModifier } from "../offline/modifiers/set-thread-snoozed-modifier";
import { SetThreadStarredModifier } from "../offline/modifiers/set-thread-starred-modifier";
import { UnsubscribeThreadModifier } from "../offline/modifiers/unsubscribe-thread-modifier";
import { modifierQueueEngine } from "../offline/runtime";

export interface MailboxThreadActions {
  toggleStar: (thread: ThreadProjection) => Promise<void>;
  toggleArchive: (thread: ThreadProjection) => Promise<void>;
  snoozeThread: (thread: ThreadProjection, snoozedUntil?: number) => Promise<void>;
  unsnoozeThread: (thread: ThreadProjection) => Promise<void>;
  unsubscribeThread: (thread: ThreadProjection) => Promise<void>;
}

interface UseMailboxThreadActionsOptions {
  account: MailAccountDescriptor;
}

export function useMailboxThreadActions({
  account
}: UseMailboxThreadActionsOptions): MailboxThreadActions {
  async function toggleStar(thread: ThreadProjection): Promise<void> {
    const modifier = SetThreadStarredModifier.create(
      account.id,
      thread.thread.id,
      !thread.thread.starred
    );
    await modifierQueueEngine.enqueue(modifier.toRecord());
  }

  async function toggleArchive(thread: ThreadProjection): Promise<void> {
    const willArchive = !thread.thread.archived;
    const modifier = SetThreadArchivedModifier.create(
      account.id,
      thread.thread.id,
      willArchive
    );
    await modifierQueueEngine.enqueue(modifier.toRecord());

    if (
      willArchive &&
      thread.thread.snoozedUntil &&
      thread.thread.snoozedUntil > Date.now()
    ) {
      await modifierQueueEngine.enqueue(
        SetThreadSnoozedModifier.create(account.id, thread.thread.id, null).toRecord()
      );
    }
  }

  async function snoozeThread(
    thread: ThreadProjection,
    snoozedUntil = getDefaultSnoozeTimestamp()
  ): Promise<void> {
    const modifier = SetThreadSnoozedModifier.create(
      account.id,
      thread.thread.id,
      snoozedUntil
    );
    await modifierQueueEngine.enqueue(modifier.toRecord());
  }

  async function unsnoozeThread(thread: ThreadProjection): Promise<void> {
    await modifierQueueEngine.enqueue(
      SetThreadSnoozedModifier.create(account.id, thread.thread.id, null).toRecord()
    );
  }

  async function unsubscribeThread(thread: ThreadProjection): Promise<void> {
    if (!thread.thread.unsubscribe || thread.thread.unsubscribedAt) {
      return;
    }

    await modifierQueueEngine.enqueue(
      UnsubscribeThreadModifier.create(
        account.id,
        thread.thread.id,
        thread.thread.unsubscribe
      ).toRecord()
    );
  }

  return {
    toggleStar,
    toggleArchive,
    snoozeThread,
    unsnoozeThread,
    unsubscribeThread
  };
}
