import type {
  PersistedModifierRecord,
  ThreadSnapshot
} from "@shared/mail/models";
import { createModifierRecord, ThreadModifier } from "./thread-modifier";
import type { ModifierPersistContext } from "./thread-modifier";

export class SetThreadSnoozedModifier extends ThreadModifier<"set-thread-snoozed"> {
  constructor(record: PersistedModifierRecord<"set-thread-snoozed">) {
    super(record);
  }

  static create(accountId: string, threadId: string, snoozedUntil: number | null) {
    return new SetThreadSnoozedModifier(
      createModifierRecord("set-thread-snoozed", {
        accountId,
        threadId,
        snoozedUntil
      })
    );
  }

  modify(snapshot: ThreadSnapshot): ThreadSnapshot {
    const nextSnapshot = this.cloneSnapshot(snapshot);

    nextSnapshot.thread.snoozedUntil = this.payload.snoozedUntil;
    nextSnapshot.thread.updatedAt = Date.now();

    return nextSnapshot;
  }

  async persist(context: ModifierPersistContext): Promise<void> {
    await context.gateway.setThreadSnoozed({
      accountId: this.accountId,
      threadId: this.threadId,
      snoozedUntil: this.payload.snoozedUntil,
      idempotencyKey: this.idempotencyKey
    });
  }
}
