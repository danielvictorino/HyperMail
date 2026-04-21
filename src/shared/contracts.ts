export const HYPERMAIL_APP_NAME = "HyperMail";

import type {
  MailAssistantRuntimeConfig,
  MailDraftSuggestion,
  MailSplitSuggestion,
  MailThreadSummary,
  MailVoiceExample,
  MailAssistantThreadContext
} from "./ai/mail-assistant";
import type {
  LocalMailAccount,
  LocalMailLabel,
  LocalMailUnsubscribe,
  ThreadSnapshot
} from "./mail/models";
import type { GmailSyncRecoveryReason } from "./mail/gmail-sync-recovery";

export const GOOGLE_OAUTH_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.send"
] as const;

export const MICROSOFT_OAUTH_SCOPES = [
  "offline_access",
  "openid",
  "profile",
  "email",
  "User.Read",
  "Mail.Read",
  "Mail.ReadWrite",
  "Mail.Send"
] as const;

export type DesktopPlatform = "darwin" | "win32" | "linux" | string;
export type AuthProvider = "google" | "microsoft";

export interface RuntimeConfigSummary {
  packaged: boolean;
  preferredConfigPath: string;
  loadedConfigPath: string | null;
  searchPaths: string[];
  googleOAuthReady: boolean;
  microsoftOAuthReady: boolean;
  openAiReady: boolean;
  updatesUrlConfigured: boolean;
  crashReportUploadConfigured: boolean;
}

export type AutoUpdatePhase =
  | "disabled"
  | "idle"
  | "checking"
  | "available"
  | "not-available"
  | "downloading"
  | "downloaded"
  | "error";

export interface AutoUpdateStatus {
  enabled: boolean;
  phase: AutoUpdatePhase;
  currentVersion: string;
  availableVersion: string | null;
  downloadedVersion: string | null;
  progressPercent: number | null;
  provider: "generic" | null;
  channel: string | null;
  configuredUrl: string | null;
  lastCheckedAt: number | null;
  message: string | null;
}

export interface ReleaseDiagnosticsSummary {
  logsDirectory: string;
  mainLogPath: string;
  crashDumpsDirectory: string;
  crashReporterEnabled: boolean;
  crashReportUploadUrl: string | null;
  updateFeedUrl: string | null;
}

export interface GmailAccountProfile {
  email: string;
  name?: string;
  picture?: string;
  messagesTotal: number;
  threadsTotal: number;
  historyId: string;
}

export interface MicrosoftAccountProfile {
  email: string;
  name?: string;
  picture?: string;
  userType?: string;
}

export interface AuthSessionSummary {
  provider: AuthProvider;
  account: GmailAccountProfile | MicrosoftAccountProfile;
  scopes: string[];
  connectedAt: number;
}

export interface ElectronAuthApi {
  getSession: () => Promise<AuthSessionSummary | null>;
  signInWithGoogle: () => Promise<AuthSessionSummary>;
  signInWithMicrosoft: () => Promise<AuthSessionSummary>;
  signOut: () => Promise<void>;
}

export interface ElectronShellApi {
  getAppVersion: () => Promise<string>;
  getPlatform: () => Promise<DesktopPlatform>;
  getRuntimeConfigSummary: () => Promise<RuntimeConfigSummary>;
  getReleaseDiagnostics: () => Promise<ReleaseDiagnosticsSummary>;
  getAutoUpdateStatus: () => Promise<AutoUpdateStatus>;
  checkForUpdates: () => Promise<AutoUpdateStatus>;
  downloadUpdate: () => Promise<AutoUpdateStatus>;
  installDownloadedUpdate: () => Promise<void>;
  openLogsDirectory: () => Promise<void>;
  onAutoUpdateStatus: (listener: (status: AutoUpdateStatus) => void) => () => void;
}

export interface GmailMailboxSyncRequest {
  accountId: string;
  historyId?: string | null;
  maxResults?: number;
}

export interface GmailMailboxSyncPayload {
  account: LocalMailAccount;
  labels: LocalMailLabel[];
  threadSnapshots: ThreadSnapshot[];
  removedThreadIds: string[];
  activeThreadIds: string[];
  historyId: string;
  mode: "full" | "incremental";
  recoveryReason: GmailSyncRecoveryReason | null;
  syncedAt: number;
}

export interface SetThreadStarredRequest {
  accountId: string;
  threadId: string;
  starred: boolean;
  idempotencyKey: string;
}

export interface SetThreadArchivedRequest {
  accountId: string;
  threadId: string;
  archived: boolean;
  idempotencyKey: string;
}

export interface UnsubscribeThreadRequest {
  accountId: string;
  threadId: string;
  unsubscribe: LocalMailUnsubscribe;
  idempotencyKey: string;
}

export interface DownloadGmailAttachmentRequest {
  accountId: string;
  threadId: string;
  messageId: string;
  attachmentId: string;
  filename: string;
  mimeType: string;
  size: number;
}

export interface CachedAttachmentPayload {
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
}

export interface SaveCachedAttachmentResult {
  canceled: boolean;
  filePath?: string;
}

export interface SendDraftRequest {
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

export interface SendDraftResult {
  remoteMessageId?: string;
  sentAt: number;
}

export interface SummarizeThreadRequest {
  thread: MailAssistantThreadContext;
}

export interface SummarizeThreadResult {
  summary: MailThreadSummary;
  provider: MailAssistantRuntimeConfig["provider"];
  model: string;
  generatedAt: number;
}

export interface SuggestSplitRequest {
  thread: MailAssistantThreadContext;
}

export interface SuggestSplitResult {
  suggestion: MailSplitSuggestion;
  provider: MailAssistantRuntimeConfig["provider"];
  model: string;
  generatedAt: number;
}

export interface GenerateDraftReplyRequest {
  thread: MailAssistantThreadContext;
  voiceExamples: MailVoiceExample[];
  accountName: string;
  signature: string;
}

export interface GenerateDraftReplyResult {
  draft: MailDraftSuggestion;
  provider: MailAssistantRuntimeConfig["provider"];
  model: string;
  generatedAt: number;
}

export interface ElectronMailApi {
  syncGmailMailbox: (
    input: GmailMailboxSyncRequest
  ) => Promise<GmailMailboxSyncPayload>;
  setThreadStarred: (input: SetThreadStarredRequest) => Promise<void>;
  setThreadArchived: (input: SetThreadArchivedRequest) => Promise<void>;
  unsubscribeGmailThread: (input: UnsubscribeThreadRequest) => Promise<void>;
  downloadGmailAttachment: (
    input: DownloadGmailAttachmentRequest
  ) => Promise<CachedAttachmentPayload>;
  saveCachedAttachment: (
    input: CachedAttachmentPayload
  ) => Promise<SaveCachedAttachmentResult>;
  sendGmailDraft: (input: SendDraftRequest) => Promise<SendDraftResult>;
}

export interface ElectronAiApi {
  getRuntimeConfig: () => Promise<MailAssistantRuntimeConfig>;
  summarizeThread: (input: SummarizeThreadRequest) => Promise<SummarizeThreadResult>;
  suggestSplit: (input: SuggestSplitRequest) => Promise<SuggestSplitResult>;
  generateDraftReply: (
    input: GenerateDraftReplyRequest
  ) => Promise<GenerateDraftReplyResult>;
}

export interface HypermailDesktopApi {
  auth: ElectronAuthApi;
  ai: ElectronAiApi;
  shell: ElectronShellApi;
  mail: ElectronMailApi;
}
