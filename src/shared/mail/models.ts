export type MailProvider = "google" | "microsoft" | "demo";
export type InboxSplit = "important" | "other" | "vip";
export type QueueStatus = "pending" | "processing" | "retry";
export type ModifierType =
  | "set-thread-starred"
  | "set-thread-archived"
  | "set-thread-snoozed"
  | "unsubscribe-thread";
export type AttachmentCacheState = "not-cached" | "cached";
export type DraftStatus = "draft" | "queued" | "sending" | "failed";
export type MessageDeliveryState = "sent" | "queued" | "sending" | "failed";
export type LocalMailUnsubscribeMethod = "mailto" | "http-get" | "http-post";

export interface LocalMailMailtoUnsubscribeTarget {
  to: string[];
  subject?: string;
  body?: string;
}

export interface LocalMailUnsubscribe {
  method: LocalMailUnsubscribeMethod;
  endpoint: string;
  oneClick: boolean;
  sourceMessageId: string;
  mailto?: LocalMailMailtoUnsubscribeTarget;
}

export interface LocalMailAccount {
  id: string;
  email: string;
  displayName: string;
  provider: MailProvider;
  connectedAt: number;
  updatedAt: number;
}

export interface LocalMailThread {
  id: string;
  accountId: string;
  subject: string;
  snippet: string;
  participantNames: string[];
  participantEmails: string[];
  split: InboxSplit;
  unread: boolean;
  starred: boolean;
  archived: boolean;
  snoozedUntil: number | null;
  unsubscribe: LocalMailUnsubscribe | null;
  unsubscribedAt: number | null;
  lastMessageAt: number;
  messageIds: string[];
  updatedAt: number;
}

export interface LocalMailMessage {
  id: string;
  accountId: string;
  threadId: string;
  subject: string;
  fromName: string;
  fromEmail: string;
  to: string[];
  cc: string[];
  bodyPlain: string;
  unread: boolean;
  starred: boolean;
  archived: boolean;
  labelIds: string[];
  attachments: LocalMailAttachment[];
  deliveryState?: MessageDeliveryState;
  draftId?: string;
  sentAt: number;
}

export interface LocalMailAttachment {
  id: string;
  attachmentId?: string;
  filename: string;
  mimeType: string;
  size: number;
  cacheState: AttachmentCacheState;
}

export interface LocalMailLabel {
  id: string;
  accountId: string;
  name: string;
  color: string;
  kind: "system" | "user";
}

export interface LocalMailDraft {
  id: string;
  accountId: string;
  threadId?: string;
  replyToMessageId?: string;
  clientMessageId: string;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  bodyHtml: string;
  status: DraftStatus;
  sendAt: number | null;
  updatedAt: number;
  lastError?: string;
}

export interface LocalCachedAttachment {
  id: string;
  accountId: string;
  threadId: string;
  messageId: string;
  attachmentId: string;
  filename: string;
  mimeType: string;
  size: number;
  contentBase64: string;
  downloadedAt: number;
  updatedAt: number;
}

export interface LocalMetadataRecord {
  key: string;
  value: string;
  updatedAt: number;
}

export interface ModifierPayloadBase {
  accountId: string;
  threadId: string;
}

export interface SetThreadStarredPayload extends ModifierPayloadBase {
  starred: boolean;
}

export interface SetThreadArchivedPayload extends ModifierPayloadBase {
  archived: boolean;
}

export interface SetThreadSnoozedPayload extends ModifierPayloadBase {
  snoozedUntil: number | null;
}

export interface UnsubscribeThreadPayload extends ModifierPayloadBase {
  unsubscribe: LocalMailUnsubscribe;
  unsubscribedAt: number;
}

export interface ModifierPayloadMap {
  "set-thread-starred": SetThreadStarredPayload;
  "set-thread-archived": SetThreadArchivedPayload;
  "set-thread-snoozed": SetThreadSnoozedPayload;
  "unsubscribe-thread": UnsubscribeThreadPayload;
}

export type AnyModifierPayload =
  | ModifierPayloadMap["set-thread-starred"]
  | ModifierPayloadMap["set-thread-archived"]
  | ModifierPayloadMap["set-thread-snoozed"]
  | ModifierPayloadMap["unsubscribe-thread"];

export interface PersistedModifierRecord<TType extends ModifierType = ModifierType> {
  id: string;
  type: TType;
  aggregateKey: string;
  accountId: string;
  threadId: string;
  payload: ModifierPayloadMap[TType];
  status: QueueStatus;
  attempts: number;
  createdAt: number;
  updatedAt: number;
  nextAttemptAt: number;
  idempotencyKey: string;
  lastError?: string;
}

export interface ThreadSnapshot {
  thread: LocalMailThread;
  messages: LocalMailMessage[];
}

export interface ThreadProjection extends ThreadSnapshot {
  queueDepth: number;
  pendingModifierIds: string[];
  pendingModifierTypes: ModifierType[];
  waitingForReply?: boolean;
  waitingSince?: number | null;
  actionNeeded?: boolean;
  localRuleSplit?: InboxSplit | null;
  localRuleReason?: string | null;
}

export interface QueueSummary {
  pending: number;
  processing: number;
  retry: number;
  total: number;
}

export interface DraftSummary {
  draft: number;
  queued: number;
  sending: number;
  failed: number;
  total: number;
}

export interface AttachmentCacheSummary {
  cachedItems: number;
  cachedBytes: number;
}

export interface MailboxPerformanceSummary {
  snapshotLoadMs: number;
  threadCount: number;
  messageCount: number;
  visibleMessageCount: number;
  draftCount: number;
  cachedAttachmentCount: number;
  generatedAt: number;
}

export interface InboxSnapshot {
  account: LocalMailAccount | null;
  threads: ThreadProjection[];
  labels: LocalMailLabel[];
  drafts: LocalMailDraft[];
  draftSummary: DraftSummary;
  queue: PersistedModifierRecord[];
  queueSummary: QueueSummary;
  attachmentCacheSummary: AttachmentCacheSummary;
  performance: MailboxPerformanceSummary;
}

export interface MailAccountDescriptor {
  id: string;
  email: string;
  displayName: string;
  provider: MailProvider;
  connectedAt: number;
}
