import type {
  ModifierType,
  PersistedModifierRecord,
  ThreadSnapshot
} from "@shared/mail/models";
import { SetThreadArchivedModifier } from "./set-thread-archived-modifier";
import { SetThreadSnoozedModifier } from "./set-thread-snoozed-modifier";
import { SetThreadStarredModifier } from "./set-thread-starred-modifier";
import type { ThreadModifier } from "./thread-modifier";
import { UnsubscribeThreadModifier } from "./unsubscribe-thread-modifier";

export function hydrateModifier(
  record: PersistedModifierRecord
): ThreadModifier<ModifierType> {
  switch (record.type) {
    case "set-thread-starred":
      return new SetThreadStarredModifier(
        record as PersistedModifierRecord<"set-thread-starred">
      );
    case "set-thread-archived":
      return new SetThreadArchivedModifier(
        record as PersistedModifierRecord<"set-thread-archived">
      );
    case "set-thread-snoozed":
      return new SetThreadSnoozedModifier(
        record as PersistedModifierRecord<"set-thread-snoozed">
      );
    case "unsubscribe-thread":
      return new UnsubscribeThreadModifier(
        record as PersistedModifierRecord<"unsubscribe-thread">
      );
    default:
      throw new Error(`Unsupported modifier type: ${String(record.type)}`);
  }
}

export function applyModifiersToThread(
  baseSnapshot: ThreadSnapshot,
  modifierRecords: PersistedModifierRecord[]
): ThreadSnapshot {
  return [...modifierRecords]
    .sort((left, right) => left.createdAt - right.createdAt)
    .reduce(
      (snapshot, record) => hydrateModifier(record).modify(snapshot),
      baseSnapshot
    );
}
