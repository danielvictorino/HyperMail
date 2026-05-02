import {
  MAIL_ASSISTANT_PROVIDERS,
  createDefaultMailAssistantSettings,
  getProviderLabel,
  type MailAssistantRuntimeConfig
} from "@shared/ai/mail-assistant";
import type {
  AttachmentCacheSummary,
  DraftSummary,
  MailboxPerformanceSummary,
  ThreadProjection
} from "@shared/mail/models";
import type { DailyBrief } from "@/lib/mailbox-view";

export function createAssistantRuntimeConfig(
  overrides: Partial<MailAssistantRuntimeConfig> = {}
): MailAssistantRuntimeConfig {
  const settings = overrides.settings ?? createDefaultMailAssistantSettings();
  const primaryConfig = settings.providers[settings.primaryProvider];
  const fallbackConfig = settings.fallbackProvider
    ? settings.providers[settings.fallbackProvider]
    : null;

  return {
    enabled: true,
    provider: settings.primaryProvider,
    model: primaryConfig.model,
    fallbackProvider: settings.fallbackProvider,
    fallbackModel: fallbackConfig?.model ?? null,
    activeProvider: settings.primaryProvider,
    activeModel: primaryConfig.model,
    settings,
    providerStatuses: {
      openai: {
        provider: "openai",
        label: getProviderLabel("openai"),
        available: true,
        hasSecret: true
      },
      anthropic: {
        provider: "anthropic",
        label: getProviderLabel("anthropic"),
        available: true,
        hasSecret: true
      },
      ollama: {
        provider: "ollama",
        label: getProviderLabel("ollama"),
        available: true,
        hasSecret: false
      }
    },
    ...overrides
  };
}

export function createThreadProjection(
  overrides: Partial<ThreadProjection["thread"]> = {}
): ThreadProjection {
  const now = Date.UTC(2026, 4, 1, 12, 0, 0);

  return {
    thread: {
      id: "thread-1",
      accountId: "account-1",
      subject: "Investor update",
      snippet: "Can you review the latest update?",
      participantNames: ["Maya Patel"],
      participantEmails: ["maya@example.com"],
      split: "important",
      unread: true,
      starred: false,
      archived: false,
      snoozedUntil: null,
      unsubscribe: null,
      unsubscribedAt: null,
      lastMessageAt: now,
      messageIds: ["message-1"],
      updatedAt: now,
      ...overrides
    },
    messages: [
      {
        id: "message-1",
        accountId: "account-1",
        threadId: "thread-1",
        subject: "Investor update",
        fromName: "Maya Patel",
        fromEmail: "maya@example.com",
        to: ["daniel@example.com"],
        cc: [],
        bodyPlain: "Can you review the latest update?",
        unread: true,
        starred: false,
        archived: false,
        labelIds: ["INBOX"],
        attachments: [],
        sentAt: now
      }
    ],
    queueDepth: 0,
    pendingModifierIds: [],
    pendingModifierTypes: []
  };
}

export function createDraftSummary(): DraftSummary {
  return {
    draft: 0,
    queued: 0,
    sending: 0,
    failed: 0,
    total: 0
  };
}

export function createAttachmentCacheSummary(): AttachmentCacheSummary {
  return {
    cachedItems: 0,
    cachedBytes: 0
  };
}

export function createPerformanceSummary(): MailboxPerformanceSummary {
  return {
    snapshotLoadMs: 12,
    threadCount: 1,
    messageCount: 1,
    visibleMessageCount: 1,
    draftCount: 0,
    cachedAttachmentCount: 0,
    generatedAt: Date.UTC(2026, 4, 1, 12, 0, 0)
  };
}

export function createDailyBrief(): DailyBrief {
  return {
    actionNeededCount: 1,
    importantUnreadCount: 1,
    waitingCount: 0,
    draftCount: 0,
    failedSendCount: 0,
    topActionLabel: "Review investor update",
    topActionDetail: "One important unread thread needs a response."
  };
}

export const providerIds = MAIL_ASSISTANT_PROVIDERS;
