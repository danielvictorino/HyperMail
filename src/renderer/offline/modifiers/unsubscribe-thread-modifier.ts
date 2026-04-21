import type {
  PersistedModifierRecord,
  ThreadSnapshot
} from "@shared/mail/models";
import { createModifierRecord, ThreadModifier } from "./thread-modifier";
import type { ModifierPersistContext } from "./thread-modifier";

export class UnsubscribeThreadModifier extends ThreadModifier<"unsubscribe-thread"> {
  constructor(record: PersistedModifierRecord<"unsubscribe-thread">) {
    super(record);
  }

  static create(
    accountId: string,
    threadId: string,
    unsubscribe: PersistedModifierRecord<"unsubscribe-thread">["payload"]["unsubscribe"]
  ) {
    return new UnsubscribeThreadModifier(
      createModifierRecord("unsubscribe-thread", {
        accountId,
        threadId,
        unsubscribe,
        unsubscribedAt: Date.now()
      })
    );
  }

  modify(snapshot: ThreadSnapshot): ThreadSnapshot {
    const nextSnapshot = this.cloneSnapshot(snapshot);

    nextSnapshot.thread.archived = true;
    nextSnapshot.thread.snoozedUntil = null;
    nextSnapshot.thread.unsubscribe = this.payload.unsubscribe;
    nextSnapshot.thread.unsubscribedAt = this.payload.unsubscribedAt;
    nextSnapshot.thread.updatedAt = Date.now();
    nextSnapshot.messages = nextSnapshot.messages.map((message) => ({
      ...message,
      archived: true
    }));

    return nextSnapshot;
  }

  async persist(context: ModifierPersistContext): Promise<void> {
    await context.gateway.unsubscribeThread({
      accountId: this.accountId,
      threadId: this.threadId,
      unsubscribe: this.payload.unsubscribe,
      idempotencyKey: this.idempotencyKey
    });
  }
}
