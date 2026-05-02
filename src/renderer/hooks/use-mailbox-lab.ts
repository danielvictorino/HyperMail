import type {
  MailAssistantProvider,
  MailAssistantProviderConnectionResult,
  MailAssistantRuntimeConfig,
  MailAssistantSettingsInput,
  MailSplitSuggestion,
  MailThreadSummary,
  OllamaModelListResult
} from "@shared/ai/mail-assistant";
import type { AuthSessionSummary } from "@shared/contracts";
import type {
  InboxSnapshot,
  LocalMailAttachment,
  LocalMailMessage,
  MailAccountDescriptor,
  ThreadProjection
} from "@shared/mail/models";
import type { GmailSyncTelemetry } from "../offline/sync/gmail-sync";
import type { MailboxSectionId } from "../state/inbox-ui-store";
import { useMailAssistantState } from "./use-mail-assistant-state";
import { useMailboxAccount } from "./use-mailbox-account";
import { useMailboxAttachments } from "./use-mailbox-attachments";
import { useMailboxComposerActions } from "./use-mailbox-composer-actions";
import { useMailboxComposerState } from "./use-mailbox-composer-state";
import { useMailboxConnectivity } from "./use-mailbox-connectivity";
import { useMailboxSnapshot } from "./use-mailbox-snapshot";
import { useMailboxSyncState } from "./use-mailbox-sync-state";
import { useMailboxThreadActions } from "./use-mailbox-thread-actions";
import type { MailboxViewState } from "./use-mailbox-view-state";
import { useMailboxViewState } from "./use-mailbox-view-state";

interface MailboxLabState {
  account: MailAccountDescriptor;
  snapshot: InboxSnapshot | null;
  threads: ThreadProjection[];
  activeThreads: ThreadProjection[];
  selectedThread: ThreadProjection | null;
  selectedThreadQueue: InboxSnapshot["queue"];
  sectionLabel: string;
  sectionDescription: string;
  navItems: MailboxViewState["navItems"];
  selectedSection: MailboxSectionId;
  searchQuery: string;
  isSearching: boolean;
  searchFocusNonce: number;
  visibleThreads: ThreadProjection[];
  setSelectedSection: (section: MailboxSectionId) => void;
  setSearchQuery: (searchQuery: string) => void;
  clearSearchQuery: () => void;
  requestSearchFocus: () => void;
  composerOpen: boolean;
  openComposer: () => void;
  closeComposer: () => void;
  toggleComposer: () => void;
  senderInsight: MailboxViewState["senderInsight"];
  calendarContext: MailboxViewState["calendarContext"];
  isDemo: boolean;
  isLoading: boolean;
  error: string | null;
  actualOnline: boolean;
  manualOffline: boolean;
  effectiveOnline: boolean;
  lastQueueError: string | null;
  assistantConfig: MailAssistantRuntimeConfig;
  assistantError: string | null;
  threadSummary: MailThreadSummary | null;
  threadSummaryGeneratedAt: number | null;
  splitSuggestion: MailSplitSuggestion | null;
  splitSuggestionGeneratedAt: number | null;
  assistantDraftSeed: {
    threadId: string;
    bodyHtml: string;
    version: number;
  } | null;
  isSummarizingThread: boolean;
  isGeneratingDraft: boolean;
  isClassifyingThread: boolean;
  isRemoteSyncing: boolean;
  lastSyncedAt: number | null;
  syncTelemetry: GmailSyncTelemetry | null;
  draftSummary: InboxSnapshot["draftSummary"];
  attachmentCacheSummary: InboxSnapshot["attachmentCacheSummary"];
  activeAttachmentId: string | null;
  performanceSummary: InboxSnapshot["performance"];
  dailyBrief: MailboxViewState["dailyBrief"];
  toggleManualOffline: () => void;
  refreshQueue: () => Promise<void>;
  syncRemote: () => Promise<void>;
  loadDraft: (thread: ThreadProjection) => Promise<string | null>;
  saveDraft: (thread: ThreadProjection, bodyHtml: string) => Promise<void>;
  queueReply: (thread: ThreadProjection, bodyHtml: string) => Promise<void>;
  queueReplyAt: (
    thread: ThreadProjection,
    bodyHtml: string,
    sendAt: number
  ) => Promise<void>;
  queueReplyLater: (thread: ThreadProjection, bodyHtml: string) => Promise<void>;
  cacheAttachment: (
    message: LocalMailMessage,
    attachment: LocalMailAttachment
  ) => Promise<void>;
  saveAssistantSettings: (settings: MailAssistantSettingsInput) => Promise<void>;
  testAssistantProviderConnection: (
    provider: MailAssistantProvider,
    settings: MailAssistantSettingsInput
  ) => Promise<MailAssistantProviderConnectionResult>;
  listOllamaModels: (baseUrl?: string | null) => Promise<OllamaModelListResult>;
  clearAssistantDraftSeed: () => void;
  generateThreadSummary: (thread?: ThreadProjection | null) => Promise<void>;
  generateVoiceDraft: (thread?: ThreadProjection | null) => Promise<void>;
  suggestThreadSplit: (thread?: ThreadProjection | null) => Promise<void>;
  applySuggestedSplit: () => Promise<void>;
  applyLocalRuleSplit: () => Promise<void>;
  selectThread: (threadId: string) => void;
  selectNextThread: () => void;
  selectPreviousThread: () => void;
  toggleStar: (thread: ThreadProjection) => Promise<void>;
  toggleArchive: (thread: ThreadProjection) => Promise<void>;
  snoozeThread: (thread: ThreadProjection, snoozedUntil?: number) => Promise<void>;
  unsnoozeThread: (thread: ThreadProjection) => Promise<void>;
  unsubscribeThread: (thread: ThreadProjection) => Promise<void>;
}

const emptyDraftSummary: InboxSnapshot["draftSummary"] = {
  draft: 0,
  queued: 0,
  sending: 0,
  failed: 0,
  total: 0
};

const emptyAttachmentCacheSummary: InboxSnapshot["attachmentCacheSummary"] = {
  cachedItems: 0,
  cachedBytes: 0
};

function createEmptyPerformanceSummary(): InboxSnapshot["performance"] {
  return {
    snapshotLoadMs: 0,
    threadCount: 0,
    messageCount: 0,
    visibleMessageCount: 0,
    draftCount: 0,
    cachedAttachmentCount: 0,
    generatedAt: Date.now()
  };
}

export function useMailboxLab(session: AuthSessionSummary | null): MailboxLabState {
  const account = useMailboxAccount(session);
  const connectivity = useMailboxConnectivity();
  const mailboxSnapshot = useMailboxSnapshot(account);
  const view = useMailboxViewState({ snapshot: mailboxSnapshot.snapshot });
  const composer = useMailboxComposerState();
  const sync = useMailboxSyncState({
    account,
    session,
    effectiveOnline: connectivity.effectiveOnline
  });
  const composerActions = useMailboxComposerActions({ account });
  const threadActions = useMailboxThreadActions({ account });
  const attachments = useMailboxAttachments();
  const assistant = useMailAssistantState({
    account,
    selectedThread: view.selectedThread,
    effectiveOnline: connectivity.effectiveOnline,
    openComposer: composer.openComposer
  });

  return {
    account,
    snapshot: mailboxSnapshot.snapshot,
    threads: view.threads,
    activeThreads: view.activeThreads,
    selectedThread: view.selectedThread,
    selectedThreadQueue: view.selectedThreadQueue,
    sectionLabel: view.sectionLabel,
    sectionDescription: view.sectionDescription,
    navItems: view.navItems,
    selectedSection: view.selectedSection,
    searchQuery: view.searchQuery,
    isSearching: view.isSearching,
    searchFocusNonce: view.searchFocusNonce,
    visibleThreads: view.visibleThreads,
    setSelectedSection: view.setSelectedSection,
    setSearchQuery: view.setSearchQuery,
    clearSearchQuery: view.clearSearchQuery,
    requestSearchFocus: view.requestSearchFocus,
    composerOpen: composer.composerOpen,
    openComposer: composer.openComposer,
    closeComposer: composer.closeComposer,
    toggleComposer: composer.toggleComposer,
    senderInsight: view.senderInsight,
    calendarContext: view.calendarContext,
    isDemo: !session,
    isLoading: mailboxSnapshot.isLoading,
    error: mailboxSnapshot.error ?? sync.syncError ?? attachments.attachmentError,
    actualOnline: connectivity.actualOnline,
    manualOffline: connectivity.manualOffline,
    effectiveOnline: connectivity.effectiveOnline,
    lastQueueError: connectivity.lastQueueError,
    assistantConfig: assistant.assistantConfig,
    assistantError: assistant.assistantError,
    threadSummary: assistant.threadSummary,
    threadSummaryGeneratedAt: assistant.threadSummaryGeneratedAt,
    splitSuggestion: assistant.splitSuggestion,
    splitSuggestionGeneratedAt: assistant.splitSuggestionGeneratedAt,
    assistantDraftSeed: assistant.assistantDraftSeed,
    isSummarizingThread: assistant.isSummarizingThread,
    isGeneratingDraft: assistant.isGeneratingDraft,
    isClassifyingThread: assistant.isClassifyingThread,
    isRemoteSyncing: sync.isRemoteSyncing,
    lastSyncedAt: sync.lastSyncedAt,
    syncTelemetry: sync.syncTelemetry,
    draftSummary: mailboxSnapshot.snapshot?.draftSummary ?? emptyDraftSummary,
    attachmentCacheSummary:
      mailboxSnapshot.snapshot?.attachmentCacheSummary ?? emptyAttachmentCacheSummary,
    activeAttachmentId: attachments.activeAttachmentId,
    performanceSummary:
      mailboxSnapshot.snapshot?.performance ?? createEmptyPerformanceSummary(),
    dailyBrief: view.dailyBrief,
    toggleManualOffline: connectivity.toggleManualOffline,
    refreshQueue: sync.refreshQueue,
    syncRemote: sync.syncRemote,
    loadDraft: composerActions.loadDraft,
    saveDraft: composerActions.saveDraft,
    queueReply: composerActions.queueReply,
    queueReplyAt: composerActions.queueReplyAt,
    queueReplyLater: composerActions.queueReplyLater,
    cacheAttachment: attachments.cacheAttachment,
    saveAssistantSettings: assistant.saveAssistantSettings,
    testAssistantProviderConnection: assistant.testAssistantProviderConnection,
    listOllamaModels: assistant.listOllamaModels,
    clearAssistantDraftSeed: assistant.clearAssistantDraftSeed,
    generateThreadSummary: assistant.generateThreadSummary,
    generateVoiceDraft: assistant.generateVoiceDraft,
    suggestThreadSplit: assistant.suggestThreadSplit,
    applySuggestedSplit: assistant.applySuggestedSplit,
    applyLocalRuleSplit: assistant.applyLocalRuleSplit,
    selectThread: view.selectThread,
    selectNextThread: view.selectNextThread,
    selectPreviousThread: view.selectPreviousThread,
    toggleStar: threadActions.toggleStar,
    toggleArchive: threadActions.toggleArchive,
    snoozeThread: threadActions.snoozeThread,
    unsnoozeThread: threadActions.unsnoozeThread,
    unsubscribeThread: threadActions.unsubscribeThread
  };
}
