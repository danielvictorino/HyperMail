import type { PersistedModifierRecord, ThreadSnapshot } from "@shared/mail/models";
import { createModifierRecord, ThreadModifier } from "./thread-modifier";
import type { ModifierPersistContext } from "./thread-modifier";

export class SetThreadArchivedModifier extends ThreadModifier<"set-thread-archived"> {
  constructor(record: PersistedModifierRecord<"set-thread-archived">) {
    super(record);
  }

  static create(accountId: string, threadId: string, archived: boolean) {
    return new SetThreadArchivedModifier(
      createModifierRecord("set-thread-archived", {
        accountId,
        threadId,
        archived
      })
    );
  }

  modify(snapshot: ThreadSnapshot): ThreadSnapshot {
    const nextSnapshot = this.cloneSnapshot(snapshot);

    nextSnapshot.thread.archived = this.payload.archived;
    nextSnapshot.thread.updatedAt = Date.now();
    nextSnapshot.messages = nextSnapshot.messages.map((message) => ({
      ...message,
      archived: this.payload.archived
    }));

    return nextSnapshot;
  }

  async persist(context: ModifierPersistContext): Promise<void> {
    await context.gateway.setThreadArchived({
      accountId: this.accountId,
      threadId: this.threadId,
      archived: this.payload.archived,
      idempotencyKey: this.idempotencyKey
    });
  }
}
