export class OfflineQueueError extends Error {
  readonly transient = true;

  constructor(message = "HyperMail is offline.") {
    super(message);
    this.name = "OfflineQueueError";
  }
}

export interface SetThreadStarredInput {
  accountId: string;
  threadId: string;
  starred: boolean;
  idempotencyKey: string;
}

export interface SetThreadArchivedInput {
  accountId: string;
  threadId: string;
  archived: boolean;
  idempotencyKey: string;
}

export interface SetThreadSnoozedInput {
  accountId: string;
  threadId: string;
  snoozedUntil: number | null;
  idempotencyKey: string;
}

export interface UnsubscribeThreadInput {
  accountId: string;
  threadId: string;
  unsubscribe: import("@shared/mail/models").LocalMailUnsubscribe;
  idempotencyKey: string;
}

export interface SendDraftInput {
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
}

export interface MailGateway {
  setThreadStarred(input: SetThreadStarredInput): Promise<void>;
  setThreadArchived(input: SetThreadArchivedInput): Promise<void>;
  setThreadSnoozed(input: SetThreadSnoozedInput): Promise<void>;
  unsubscribeThread(input: UnsubscribeThreadInput): Promise<void>;
  sendDraft(input: SendDraftInput): Promise<{ remoteMessageId?: string; sentAt: number }>;
}
