import type { PersistedModifierRecord, ThreadSnapshot } from "@shared/mail/models";
import { createModifierRecord, ThreadModifier } from "./thread-modifier";
import type { ModifierPersistContext } from "./thread-modifier";

function upsertLabel(labelIds: string[], label: string): string[] {
  return labelIds.includes(label) ? labelIds : [...labelIds, label];
}

function removeLabel(labelIds: string[], label: string): string[] {
  return labelIds.filter((value) => value !== label);
}

export class SetThreadStarredModifier extends ThreadModifier<"set-thread-starred"> {
  constructor(record: PersistedModifierRecord<"set-thread-starred">) {
    super(record);
  }

  static create(accountId: string, threadId: string, starred: boolean) {
    return new SetThreadStarredModifier(
      createModifierRecord("set-thread-starred", {
        accountId,
        threadId,
        starred
      })
    );
  }

  modify(snapshot: ThreadSnapshot): ThreadSnapshot {
    const nextSnapshot = this.cloneSnapshot(snapshot);

    nextSnapshot.thread.starred = this.payload.starred;
    nextSnapshot.thread.updatedAt = Date.now();
    nextSnapshot.messages = nextSnapshot.messages.map((message) => ({
      ...message,
      starred: this.payload.starred,
      labelIds: this.payload.starred
        ? upsertLabel(message.labelIds, "STARRED")
        : removeLabel(message.labelIds, "STARRED")
    }));

    return nextSnapshot;
  }

  async persist(context: ModifierPersistContext): Promise<void> {
    await context.gateway.setThreadStarred({
      accountId: this.accountId,
      threadId: this.threadId,
      starred: this.payload.starred,
      idempotencyKey: this.idempotencyKey
    });
  }
}
