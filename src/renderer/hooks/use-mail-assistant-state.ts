import { useEffect, useRef, useState } from "react";
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
import type { MailAccountDescriptor, ThreadProjection } from "@shared/mail/models";
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
import { saveDraftForThread } from "../offline/outbox/draft-service";

export interface MailAssistantState {
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
}

interface UseMailAssistantStateOptions {
  account: MailAccountDescriptor;
  selectedThread: ThreadProjection | null;
  effectiveOnline: boolean;
  openComposer: () => void;
}

export function useMailAssistantState({
  account,
  selectedThread,
  effectiveOnline,
  openComposer
}: UseMailAssistantStateOptions): MailAssistantState {
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
  const autoSummaryAttemptKeys = useRef(new Set<string>());
  const generateThreadSummaryRef = useRef<
    (thread?: ThreadProjection | null) => Promise<void>
  >(async () => {});

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
    saveAssistantSettings,
    testAssistantProviderConnection,
    listOllamaModels,
    clearAssistantDraftSeed: () => setAssistantDraftSeed(null),
    generateThreadSummary,
    generateVoiceDraft,
    suggestThreadSplit,
    applySuggestedSplit,
    applyLocalRuleSplit
  };
}

export function getAssistantDisabledReason(
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

export function createLoadingAssistantConfig(
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
