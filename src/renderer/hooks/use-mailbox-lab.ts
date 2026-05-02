import { liveQuery } from "dexie";
import {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import type {
  MailAssistantArtifactRecord,
  MailAssistantProvider,
  MailAssistantProviderConnectionResult,
  MailAssistantRuntimeConfig,
  MailAssistantSettingsInput,
  MailSplitSuggestion,
  MailThreadSummary,
  OllamaModelListResult
} from "@shared/ai/mail-assistant";
import {
  buildAssistantThreadContext,
  createDefaultMailAssistantSettings,
  createReplySignature,
  renderDraftSuggestionHtml
} from "@shared/ai/mail-assistant";
import type { AuthSessionSummary } from "@shared/contracts";
import { createGoogleAccountId } from "@shared/mail/google-transformers";
import { createMicrosoftAccountId } from "@shared/mail/provider-ids";
import type {
  InboxSnapshot,
  LocalMailAttachment,
  LocalMailMessage,
  MailAccountDescriptor,
  ThreadProjection
} from "@shared/mail/models";
import {
  buildCalendarContext,
  buildDailyBrief,
  buildSenderInsight,
  filterThreadsBySection,
  getMailboxNavItems,
  getSectionDescription,
  getSectionHeadline,
  type DailyBrief
} from "../lib/mailbox-view";
import { searchThreads } from "../lib/mailbox-search";
import { getDesktopApi } from "../lib/desktop-api";
import {
  applyThreadSplitLocally,
  buildThreadAssistantFingerprint,
  listVoiceExamplesForAccount,
  loadSplitSuggestionRecord,
  loadThreadSummaryRecord,
  saveSplitSuggestionRecord,
  saveThreadSummaryRecord
} from "../offline/assistant/thread-assistant-cache";
import {
  cacheAttachmentLocally,
  exportCachedAttachment
} from "../offline/attachments/attachment-cache";
import { DEMO_ACCOUNT, ensureSeededMailbox } from "../offline/demo/seed-mailbox";
import { loadInboxSnapshot } from "../offline/db/load-inbox-snapshot";
import { SetThreadArchivedModifier } from "../offline/modifiers/set-thread-archived-modifier";
import { SetThreadSnoozedModifier } from "../offline/modifiers/set-thread-snoozed-modifier";
import { SetThreadStarredModifier } from "../offline/modifiers/set-thread-starred-modifier";
import { UnsubscribeThreadModifier } from "../offline/modifiers/unsubscribe-thread-modifier";
import {
  getDraftForThread,
  queueDraftForDelivery,
  saveDraftForThread
} from "../offline/outbox/draft-service";
import {
  modifierQueueEngine,
  outboxEngine,
  startOfflineRuntime
} from "../offline/runtime";
import {
  getGmailSyncTelemetry,
  getLastGmailSyncedAt,
  type GmailSyncTelemetry,
  syncGmailAccount
} from "../offline/sync/gmail-sync";
import { getDefaultSnoozeTimestamp } from "../lib/send-later";
import { useConnectivityBootstrap } from "./use-connectivity-bootstrap";
import { useConnectivityStore } from "../state/connectivity-store";
import { useInboxUiStore } from "../state/inbox-ui-store";

interface MailboxLabState {
  account: MailAccountDescriptor;
  snapshot: InboxSnapshot | null;
  threads: ThreadProjection[];
  activeThreads: ThreadProjection[];
  selectedThread: ThreadProjection | null;
  selectedThreadQueue: InboxSnapshot["queue"];
  sectionLabel: string;
  sectionDescription: string;
  navItems: ReturnType<typeof getMailboxNavItems>;
  selectedSection: ReturnType<typeof useInboxUiStore.getState>["selectedSection"];
  searchQuery: string;
  isSearching: boolean;
  searchFocusNonce: number;
  visibleThreads: ThreadProjection[];
  setSelectedSection: (
    section: ReturnType<typeof useInboxUiStore.getState>["selectedSection"]
  ) => void;
  setSearchQuery: (searchQuery: string) => void;
  clearSearchQuery: () => void;
  requestSearchFocus: () => void;
  composerOpen: boolean;
  openComposer: () => void;
  closeComposer: () => void;
  toggleComposer: () => void;
  senderInsight: ReturnType<typeof buildSenderInsight>;
  calendarContext: ReturnType<typeof buildCalendarContext>;
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
  dailyBrief: DailyBrief;
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

function buildAccountDescriptor(
  session: AuthSessionSummary | null
): MailAccountDescriptor {
  if (!session) {
    return DEMO_ACCOUNT;
  }

  return {
    id:
      session.provider === "google"
        ? createGoogleAccountId(session.account.email)
        : createMicrosoftAccountId(session.account.email),
    email: session.account.email,
    displayName: session.account.name ?? session.account.email,
    provider: session.provider,
    connectedAt: session.connectedAt
  };
}

export function useMailboxLab(session: AuthSessionSummary | null): MailboxLabState {
  useConnectivityBootstrap();

  const selectedThreadId = useInboxUiStore((state) => state.selectedThreadId);
  const setSelectedThreadId = useInboxUiStore((state) => state.setSelectedThreadId);
  const selectedSection = useInboxUiStore((state) => state.selectedSection);
  const setSelectedSectionState = useInboxUiStore((state) => state.setSelectedSection);
  const searchQuery = useInboxUiStore((state) => state.searchQuery);
  const searchFocusNonce = useInboxUiStore((state) => state.searchFocusNonce);
  const setSearchQueryState = useInboxUiStore((state) => state.setSearchQuery);
  const clearSearchQueryState = useInboxUiStore((state) => state.clearSearchQuery);
  const requestSearchFocusState = useInboxUiStore((state) => state.requestSearchFocus);
  const composerOpen = useInboxUiStore((state) => state.composerOpen);
  const openComposer = useInboxUiStore((state) => state.openComposer);
  const closeComposer = useInboxUiStore((state) => state.closeComposer);
  const toggleComposer = useInboxUiStore((state) => state.toggleComposer);
  const actualOnline = useConnectivityStore((state) => state.actualOnline);
  const manualOffline = useConnectivityStore((state) => state.manualOffline);
  const lastQueueError = useConnectivityStore((state) => state.lastQueueError);
  const toggleManualOffline = useConnectivityStore(
    (state) => state.toggleManualOffline
  );

  const account = useMemo(() => buildAccountDescriptor(session), [session]);
  const [snapshot, setSnapshot] = useState<InboxSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [assistantError, setAssistantError] = useState<string | null>(null);
  const [assistantConfig, setAssistantConfig] = useState<MailAssistantRuntimeConfig>(
    createLoadingAssistantConfig()
  );
  const [threadSummaryRecord, setThreadSummaryRecord] =
    useState<MailAssistantArtifactRecord<MailThreadSummary> | null>(null);
  const [splitSuggestionRecord, setSplitSuggestionRecord] =
    useState<MailAssistantArtifactRecord<MailSplitSuggestion> | null>(null);
  const [assistantDraftSeed, setAssistantDraftSeed] = useState<{
    threadId: string;
    bodyHtml: string;
    version: number;
  } | null>(null);
  const [isSummarizingThread, setIsSummarizingThread] = useState(false);
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [isClassifyingThread, setIsClassifyingThread] = useState(false);
  const [isRemoteSyncing, setIsRemoteSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [syncTelemetry, setSyncTelemetry] = useState<GmailSyncTelemetry | null>(null);
  const [activeAttachmentId, setActiveAttachmentId] = useState<string | null>(null);
  const autoSummaryAttemptKeys = useRef(new Set<string>());
  const generateThreadSummaryRef = useRef<
    (thread?: ThreadProjection | null) => Promise<void>
  >(async () => {});
  const effectiveOnline = actualOnline && !manualOffline;
  const deferredSearchQuery = useDeferredValue(searchQuery);

  useEffect(() => {
    startOfflineRuntime();

    let cancelled = false;
    let subscription: { unsubscribe: () => void } | null = null;

    setIsLoading(true);
    setError(null);

    void (async () => {
      try {
        await ensureSeededMailbox(account);

        if (cancelled) {
          return;
        }

        subscription = liveQuery(() => loadInboxSnapshot(account.id)).subscribe({
          next: (nextSnapshot) => {
            setSnapshot(nextSnapshot);
            setIsLoading(false);
          },
          error: (liveQueryError) => {
            setError(
              liveQueryError instanceof Error
                ? liveQueryError.message
                : "HyperMail could not read the local mailbox."
            );
            setIsLoading(false);
          }
        });
      } catch (seedError) {
        setError(
          seedError instanceof Error
            ? seedError.message
            : "HyperMail could not seed the local mailbox."
        );
        setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, [account]);

  useEffect(() => {
    let cancelled = false;

    void getDesktopApi()
      .ai.getRuntimeConfig()
      .then((config) => {
        if (!cancelled) {
          setAssistantConfig(config);
        }
      })
      .catch((runtimeError) => {
        if (!cancelled) {
          setAssistantConfig(
            createLoadingAssistantConfig(
              runtimeError instanceof Error
                ? runtimeError.message
                : "HyperMail could not load AI runtime settings."
            )
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!session || session.provider !== "google") {
      setLastSyncedAt(null);
      setSyncTelemetry(null);
      setSyncError(null);
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      const storedSyncedAt = await getLastGmailSyncedAt(account.id);
      const telemetry = await getGmailSyncTelemetry(account.id);

      if (!cancelled) {
        setLastSyncedAt(storedSyncedAt);
        setSyncTelemetry(telemetry);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [account.id, session]);

  useEffect(() => {
    if (!session || session.provider !== "google" || !effectiveOnline) {
      setIsRemoteSyncing(false);
      return;
    }

    let cancelled = false;
    let syncInFlight = false;
    const intervalHandle = globalThis.setInterval(() => {
      void runRemoteSync();
    }, 45_000);

    async function runRemoteSync(): Promise<void> {
      if (syncInFlight) {
        return;
      }

      syncInFlight = true;
      setIsRemoteSyncing(true);

      try {
        const payload = await syncGmailAccount(account.id);
        const telemetry = await getGmailSyncTelemetry(account.id);

        if (!cancelled) {
          setLastSyncedAt(payload.syncedAt);
          setSyncTelemetry(telemetry);
          setSyncError(null);
        }
      } catch (syncFailure) {
        if (!cancelled) {
          setSyncError(
            syncFailure instanceof Error
              ? syncFailure.message
              : "HyperMail could not sync Gmail into the local cache."
          );
        }
      } finally {
        syncInFlight = false;

        if (!cancelled) {
          setIsRemoteSyncing(false);
        }
      }
    }

    void runRemoteSync();

    return () => {
      cancelled = true;
      clearInterval(intervalHandle);
    };
  }, [account.id, effectiveOnline, session]);

  const threads = useMemo(() => snapshot?.threads ?? [], [snapshot?.threads]);
  const navItems = useMemo(() => getMailboxNavItems(threads), [threads]);
  const activeThreads = useMemo(
    () => filterThreadsBySection(threads, selectedSection),
    [selectedSection, threads]
  );
  const visibleThreads = useMemo(
    () =>
      deferredSearchQuery.trim()
        ? searchThreads(threads, deferredSearchQuery)
        : activeThreads,
    [activeThreads, deferredSearchQuery, threads]
  );
  const isSearching = deferredSearchQuery.trim().length > 0;
  const dailyBrief = useMemo(
    () =>
      buildDailyBrief(
        threads,
        snapshot?.draftSummary ?? {
          draft: 0,
          queued: 0,
          sending: 0,
          failed: 0,
          total: 0
        }
      ),
    [snapshot?.draftSummary, threads]
  );

  useEffect(() => {
    const selectedStillExists = visibleThreads.some(
      (thread) => thread.thread.id === selectedThreadId
    );

    if (selectedStillExists) {
      return;
    }

    const nextThread = visibleThreads[0] ?? null;
    setSelectedThreadId(nextThread?.thread.id ?? null);
  }, [selectedThreadId, setSelectedThreadId, visibleThreads]);

  const selectedThread = useMemo(() => {
    if (!snapshot) {
      return null;
    }

    return (
      visibleThreads.find((thread) => thread.thread.id === selectedThreadId) ??
      visibleThreads[0] ??
      null
    );
  }, [selectedThreadId, snapshot, visibleThreads]);

  useEffect(() => {
    let cancelled = false;

    if (!selectedThread) {
      setThreadSummaryRecord(null);
      setSplitSuggestionRecord(null);
      setAssistantError(null);
      return () => {
        cancelled = true;
      };
    }

    setAssistantError(null);

    const sourceFingerprint = buildThreadAssistantFingerprint(selectedThread);

    void (async () => {
      const [summaryRecord, splitRecord] = await Promise.all([
        loadThreadSummaryRecord(
          account.id,
          selectedThread.thread.id,
          sourceFingerprint
        ),
        loadSplitSuggestionRecord(
          account.id,
          selectedThread.thread.id,
          sourceFingerprint
        )
      ]);

      if (!cancelled) {
        setThreadSummaryRecord(summaryRecord);
        setSplitSuggestionRecord(splitRecord);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [account.id, selectedThread]);

  const selectedThreadQueue = useMemo(() => {
    if (!selectedThread || !snapshot) {
      return [];
    }

    return snapshot.queue.filter(
      (record) => record.threadId === selectedThread.thread.id
    );
  }, [selectedThread, snapshot]);

  const senderInsight = useMemo(
    () => buildSenderInsight(selectedThread),
    [selectedThread]
  );
  const calendarContext = useMemo(
    () => buildCalendarContext(selectedThread),
    [selectedThread]
  );

  function selectThread(threadId: string): void {
    startTransition(() => {
      setSelectedThreadId(threadId);
    });
  }

  function setSelectedSection(
    section: ReturnType<typeof useInboxUiStore.getState>["selectedSection"]
  ): void {
    startTransition(() => {
      setSelectedSectionState(section);
    });
  }

  function moveSelectedThread(delta: number): void {
    if (visibleThreads.length === 0) {
      return;
    }

    const currentIndex = visibleThreads.findIndex(
      (thread) => thread.thread.id === selectedThreadId
    );
    const safeCurrentIndex = currentIndex >= 0 ? currentIndex : 0;
    const nextIndex =
      (safeCurrentIndex + delta + visibleThreads.length) % visibleThreads.length;
    const nextThread = visibleThreads[nextIndex];

    if (!nextThread) {
      return;
    }

    selectThread(nextThread.thread.id);
  }

  function selectNextThread(): void {
    moveSelectedThread(1);
  }

  function selectPreviousThread(): void {
    moveSelectedThread(-1);
  }

  async function toggleStar(thread: ThreadProjection): Promise<void> {
    const modifier = SetThreadStarredModifier.create(
      account.id,
      thread.thread.id,
      !thread.thread.starred
    );
    await modifierQueueEngine.enqueue(modifier.toRecord());
  }

  async function toggleArchive(thread: ThreadProjection): Promise<void> {
    const willArchive = !thread.thread.archived;
    const modifier = SetThreadArchivedModifier.create(
      account.id,
      thread.thread.id,
      willArchive
    );
    await modifierQueueEngine.enqueue(modifier.toRecord());

    if (
      willArchive &&
      thread.thread.snoozedUntil &&
      thread.thread.snoozedUntil > Date.now()
    ) {
      await modifierQueueEngine.enqueue(
        SetThreadSnoozedModifier.create(account.id, thread.thread.id, null).toRecord()
      );
    }
  }

  async function snoozeThread(
    thread: ThreadProjection,
    snoozedUntil = getDefaultSnoozeTimestamp()
  ): Promise<void> {
    const modifier = SetThreadSnoozedModifier.create(
      account.id,
      thread.thread.id,
      snoozedUntil
    );
    await modifierQueueEngine.enqueue(modifier.toRecord());
  }

  async function unsnoozeThread(thread: ThreadProjection): Promise<void> {
    await modifierQueueEngine.enqueue(
      SetThreadSnoozedModifier.create(account.id, thread.thread.id, null).toRecord()
    );
  }

  async function unsubscribeThread(thread: ThreadProjection): Promise<void> {
    if (!thread.thread.unsubscribe || thread.thread.unsubscribedAt) {
      return;
    }

    await modifierQueueEngine.enqueue(
      UnsubscribeThreadModifier.create(
        account.id,
        thread.thread.id,
        thread.thread.unsubscribe
      ).toRecord()
    );
  }

  async function syncRemote(): Promise<void> {
    if (!session || session.provider !== "google" || !effectiveOnline) {
      return;
    }

    setIsRemoteSyncing(true);

    try {
      const payload = await syncGmailAccount(account.id);
      const telemetry = await getGmailSyncTelemetry(account.id);
      setLastSyncedAt(payload.syncedAt);
      setSyncTelemetry(telemetry);
      setSyncError(null);
    } catch (syncFailure) {
      const message =
        syncFailure instanceof Error
          ? syncFailure.message
          : "HyperMail could not sync Gmail into the local cache.";
      setSyncError(message);
      throw syncFailure;
    } finally {
      setIsRemoteSyncing(false);
    }
  }

  async function loadDraft(thread: ThreadProjection): Promise<string | null> {
    const draft = await getDraftForThread(account.id, thread.thread.id);
    return draft?.bodyHtml ?? null;
  }

  async function saveDraft(thread: ThreadProjection, bodyHtml: string): Promise<void> {
    await saveDraftForThread(thread, bodyHtml);
  }

  async function queueReply(thread: ThreadProjection, bodyHtml: string): Promise<void> {
    await queueDraftForDelivery(thread, bodyHtml, null);
    await outboxEngine.kick();
  }

  async function queueReplyAt(
    thread: ThreadProjection,
    bodyHtml: string,
    sendAt: number
  ): Promise<void> {
    await queueDraftForDelivery(thread, bodyHtml, sendAt);
  }

  async function queueReplyLater(
    thread: ThreadProjection,
    bodyHtml: string
  ): Promise<void> {
    await queueReplyAt(thread, bodyHtml, Date.now() + 60 * 60 * 1000);
  }

  async function cacheAttachment(
    message: LocalMailMessage,
    attachment: LocalMailAttachment
  ): Promise<void> {
    setActiveAttachmentId(attachment.id);

    try {
      if (attachment.cacheState === "cached") {
        await exportCachedAttachment(message, attachment);
      } else {
        await cacheAttachmentLocally(message, attachment);
      }

      setAttachmentError(null);
    } catch (attachmentFailure) {
      setAttachmentError(
        attachmentFailure instanceof Error
          ? attachmentFailure.message
          : "HyperMail could not open this attachment."
      );
    } finally {
      setActiveAttachmentId(null);
    }
  }

  async function generateThreadSummary(thread = selectedThread): Promise<void> {
    if (!thread) {
      return;
    }

    const disabledReason = getAssistantDisabledReason(assistantConfig, effectiveOnline);

    if (disabledReason) {
      setAssistantError(disabledReason);
      return;
    }

    setAssistantError(null);
    setIsSummarizingThread(true);

    try {
      const result = await getDesktopApi().ai.summarizeThread({
        thread: buildAssistantThreadContext(thread, account.email)
      });
      const record: MailAssistantArtifactRecord<MailThreadSummary> = {
        provider: result.provider,
        model: result.model,
        generatedAt: result.generatedAt,
        fallbackUsed: result.fallbackUsed,
        sourceFingerprint: buildThreadAssistantFingerprint(thread),
        data: result.summary
      };

      await saveThreadSummaryRecord(account.id, thread.thread.id, record);

      if (selectedThread?.thread.id === thread.thread.id) {
        setThreadSummaryRecord(record);
      }
    } catch (summaryError) {
      setAssistantError(
        summaryError instanceof Error
          ? summaryError.message
          : "HyperMail could not summarize this thread."
      );
    } finally {
      setIsSummarizingThread(false);
    }
  }

  generateThreadSummaryRef.current = generateThreadSummary;

  useEffect(() => {
    if (
      !selectedThread ||
      threadSummaryRecord ||
      isSummarizingThread ||
      !assistantConfig.enabled ||
      !effectiveOnline
    ) {
      return;
    }

    if (
      !selectedThread.thread.unread &&
      !selectedThread.actionNeeded &&
      !selectedThread.waitingForReply
    ) {
      return;
    }

    const sourceFingerprint = buildThreadAssistantFingerprint(selectedThread);
    const attemptKey = `${selectedThread.thread.id}:${sourceFingerprint}`;

    if (autoSummaryAttemptKeys.current.has(attemptKey)) {
      return;
    }

    autoSummaryAttemptKeys.current.add(attemptKey);

    const handle = globalThis.setTimeout(() => {
      void generateThreadSummaryRef.current(selectedThread);
    }, 750);

    return () => {
      globalThis.clearTimeout(handle);
    };
  }, [
    assistantConfig.enabled,
    effectiveOnline,
    isSummarizingThread,
    selectedThread,
    threadSummaryRecord
  ]);

  async function generateVoiceDraft(thread = selectedThread): Promise<void> {
    if (!thread) {
      return;
    }

    const disabledReason = getAssistantDisabledReason(assistantConfig, effectiveOnline);

    if (disabledReason) {
      setAssistantError(disabledReason);
      return;
    }

    setAssistantError(null);
    setIsGeneratingDraft(true);

    try {
      const voiceExamples = await listVoiceExamplesForAccount(
        account.id,
        account.email
      );
      const result = await getDesktopApi().ai.generateDraftReply({
        thread: buildAssistantThreadContext(thread, account.email),
        voiceExamples,
        accountName: account.displayName,
        signature: createReplySignature(account.displayName)
      });
      const bodyHtml = renderDraftSuggestionHtml(result.draft);

      await saveDraftForThread(thread, bodyHtml);
      setAssistantDraftSeed({
        threadId: thread.thread.id,
        bodyHtml,
        version: Date.now()
      });
      openComposer();
    } catch (draftError) {
      setAssistantError(
        draftError instanceof Error
          ? draftError.message
          : "HyperMail could not draft a reply for this thread."
      );
    } finally {
      setIsGeneratingDraft(false);
    }
  }

  async function suggestThreadSplit(thread = selectedThread): Promise<void> {
    if (!thread) {
      return;
    }

    const disabledReason = getAssistantDisabledReason(assistantConfig, effectiveOnline);

    if (disabledReason) {
      setAssistantError(disabledReason);
      return;
    }

    setAssistantError(null);
    setIsClassifyingThread(true);

    try {
      const result = await getDesktopApi().ai.suggestSplit({
        thread: buildAssistantThreadContext(thread, account.email)
      });
      const record: MailAssistantArtifactRecord<MailSplitSuggestion> = {
        provider: result.provider,
        model: result.model,
        generatedAt: result.generatedAt,
        fallbackUsed: result.fallbackUsed,
        sourceFingerprint: buildThreadAssistantFingerprint(thread),
        data: result.suggestion
      };

      await saveSplitSuggestionRecord(account.id, thread.thread.id, record);

      if (selectedThread?.thread.id === thread.thread.id) {
        setSplitSuggestionRecord(record);
      }
    } catch (splitError) {
      setAssistantError(
        splitError instanceof Error
          ? splitError.message
          : "HyperMail could not classify this thread."
      );
    } finally {
      setIsClassifyingThread(false);
    }
  }

  async function applySuggestedSplit(): Promise<void> {
    if (!selectedThread || !splitSuggestionRecord) {
      return;
    }

    await applyThreadSplitLocally(
      selectedThread.thread.id,
      splitSuggestionRecord.data.split
    );
  }

  async function applyLocalRuleSplit(): Promise<void> {
    if (!selectedThread?.localRuleSplit) {
      return;
    }

    await applyThreadSplitLocally(
      selectedThread.thread.id,
      selectedThread.localRuleSplit
    );
  }

  async function saveAssistantSettings(
    settings: MailAssistantSettingsInput
  ): Promise<void> {
    try {
      const result = await getDesktopApi().ai.saveSettings({ settings });
      setAssistantConfig(result.runtimeConfig);
      setAssistantError(null);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "HyperMail could not save AI provider settings.";
      setAssistantError(message);
      throw error;
    }
  }

  async function testAssistantProviderConnection(
    provider: MailAssistantProvider,
    settings: MailAssistantSettingsInput
  ): Promise<MailAssistantProviderConnectionResult> {
    return await getDesktopApi().ai.testProviderConnection({
      provider,
      settings
    });
  }

  async function listOllamaModels(
    baseUrl?: string | null
  ): Promise<OllamaModelListResult> {
    return await getDesktopApi().ai.listOllamaModels({
      baseUrl: baseUrl ?? null
    });
  }

  return {
    account,
    snapshot,
    threads,
    activeThreads,
    selectedThread,
    selectedThreadQueue,
    sectionLabel: isSearching ? "Search" : getSectionHeadline(selectedSection),
    sectionDescription: isSearching
      ? `Showing ${visibleThreads.length} local matches for "${deferredSearchQuery.trim()}" across the cached mailbox.`
      : getSectionDescription(selectedSection),
    navItems,
    selectedSection,
    searchQuery,
    isSearching,
    searchFocusNonce,
    visibleThreads,
    setSelectedSection,
    setSearchQuery: setSearchQueryState,
    clearSearchQuery: clearSearchQueryState,
    requestSearchFocus: requestSearchFocusState,
    composerOpen,
    openComposer,
    closeComposer,
    toggleComposer,
    senderInsight,
    calendarContext,
    isDemo: !session,
    isLoading,
    error: error ?? syncError ?? attachmentError,
    actualOnline,
    manualOffline,
    effectiveOnline,
    lastQueueError,
    assistantConfig,
    assistantError,
    threadSummary: threadSummaryRecord?.data ?? null,
    threadSummaryGeneratedAt: threadSummaryRecord?.generatedAt ?? null,
    splitSuggestion: splitSuggestionRecord?.data ?? null,
    splitSuggestionGeneratedAt: splitSuggestionRecord?.generatedAt ?? null,
    assistantDraftSeed,
    isSummarizingThread,
    isGeneratingDraft,
    isClassifyingThread,
    isRemoteSyncing,
    lastSyncedAt,
    syncTelemetry,
    draftSummary: snapshot?.draftSummary ?? {
      draft: 0,
      queued: 0,
      sending: 0,
      failed: 0,
      total: 0
    },
    attachmentCacheSummary: snapshot?.attachmentCacheSummary ?? {
      cachedItems: 0,
      cachedBytes: 0
    },
    activeAttachmentId,
    performanceSummary: snapshot?.performance ?? {
      snapshotLoadMs: 0,
      threadCount: 0,
      messageCount: 0,
      visibleMessageCount: 0,
      draftCount: 0,
      cachedAttachmentCount: 0,
      generatedAt: Date.now()
    },
    dailyBrief,
    toggleManualOffline,
    refreshQueue: async () => {
      await modifierQueueEngine.kick();
      await outboxEngine.kick();
      try {
        await syncRemote();
      } catch {
        // The error is already stored in mailbox state for the UI.
      }
    },
    syncRemote,
    loadDraft,
    saveDraft,
    queueReply,
    queueReplyAt,
    queueReplyLater,
    cacheAttachment,
    saveAssistantSettings,
    testAssistantProviderConnection,
    listOllamaModels,
    clearAssistantDraftSeed: () => setAssistantDraftSeed(null),
    generateThreadSummary,
    generateVoiceDraft,
    suggestThreadSplit,
    applySuggestedSplit,
    applyLocalRuleSplit,
    selectThread,
    selectNextThread,
    selectPreviousThread,
    toggleStar,
    toggleArchive,
    snoozeThread,
    unsnoozeThread,
    unsubscribeThread
  };
}

function getAssistantDisabledReason(
  assistantConfig: MailAssistantRuntimeConfig,
  effectiveOnline: boolean
): string | null {
  if (!assistantConfig.enabled) {
    return assistantConfig.reason ?? "AI assistance is not configured.";
  }

  if (!effectiveOnline) {
    return "AI assistance needs a live connection.";
  }

  return null;
}

function createLoadingAssistantConfig(
  reason = "Loading AI runtime..."
): MailAssistantRuntimeConfig {
  const settings = createDefaultMailAssistantSettings();

  return {
    enabled: false,
    provider: settings.primaryProvider,
    model: settings.providers[settings.primaryProvider].model,
    fallbackProvider: settings.fallbackProvider,
    fallbackModel: settings.fallbackProvider
      ? settings.providers[settings.fallbackProvider].model
      : null,
    activeProvider: null,
    activeModel: null,
    reason,
    settings,
    providerStatuses: {
      openai: {
        provider: "openai",
        label: "OpenAI",
        available: false,
        hasSecret: false,
        reason
      },
      anthropic: {
        provider: "anthropic",
        label: "Anthropic",
        available: false,
        hasSecret: false,
        reason
      },
      ollama: {
        provider: "ollama",
        label: "Ollama",
        available: false,
        hasSecret: true,
        reason
      }
    }
  };
}
