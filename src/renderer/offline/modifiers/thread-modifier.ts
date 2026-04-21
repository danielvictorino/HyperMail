import type {
  ModifierPayloadMap,
  ModifierType,
  PersistedModifierRecord,
  ThreadSnapshot
} from "@shared/mail/models";
import type { MailGateway } from "../queue/mail-gateway";

export interface ModifierPersistContext {
  gateway: MailGateway;
}

function cloneMessage<T extends ThreadSnapshot["messages"][number]>(message: T): T {
  return {
    ...message,
    to: [...message.to],
    cc: [...message.cc],
    labelIds: [...message.labelIds],
    attachments: message.attachments.map((attachment) => ({ ...attachment }))
  };
}

function cloneThreadSnapshot(snapshot: ThreadSnapshot): ThreadSnapshot {
  return {
    thread: {
      ...snapshot.thread,
      participantNames: [...snapshot.thread.participantNames],
      participantEmails: [...snapshot.thread.participantEmails],
      messageIds: [...snapshot.thread.messageIds],
      unsubscribe: snapshot.thread.unsubscribe
        ? {
            ...snapshot.thread.unsubscribe,
            mailto: snapshot.thread.unsubscribe.mailto
              ? {
                  ...snapshot.thread.unsubscribe.mailto,
                  to: [...snapshot.thread.unsubscribe.mailto.to]
                }
              : undefined
          }
        : null
    },
    messages: snapshot.messages.map(cloneMessage)
  };
}

export abstract class ThreadModifier<TType extends ModifierType> {
  protected constructor(private readonly record: PersistedModifierRecord<TType>) {}

  get id(): string {
    return this.record.id;
  }

  get type(): TType {
    return this.record.type;
  }

  get aggregateKey(): string {
    return this.record.aggregateKey;
  }

  get accountId(): string {
    return this.record.accountId;
  }

  get threadId(): string {
    return this.record.threadId;
  }

  get payload(): ModifierPayloadMap[TType] {
    return this.record.payload;
  }

  get idempotencyKey(): string {
    return this.record.idempotencyKey;
  }

  toRecord(): PersistedModifierRecord<TType> {
    return {
      ...this.record,
      payload: { ...this.record.payload }
    };
  }

  protected cloneSnapshot(snapshot: ThreadSnapshot): ThreadSnapshot {
    return cloneThreadSnapshot(snapshot);
  }

  abstract modify(snapshot: ThreadSnapshot): ThreadSnapshot;
  abstract persist(context: ModifierPersistContext): Promise<void>;
}

export function createModifierRecord<TType extends ModifierType>(
  type: TType,
  payload: ModifierPayloadMap[TType]
): PersistedModifierRecord<TType> {
  const now = Date.now();

  return {
    id: crypto.randomUUID(),
    type,
    aggregateKey: payload.threadId,
    accountId: payload.accountId,
    threadId: payload.threadId,
    payload,
    status: "pending",
    attempts: 0,
    createdAt: now,
    updatedAt: now,
    nextAttemptAt: now,
    idempotencyKey: crypto.randomUUID()
  };
}
