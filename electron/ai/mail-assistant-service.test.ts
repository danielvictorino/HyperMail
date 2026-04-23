import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createDefaultMailAssistantSettings,
  type MailAssistantSettings
} from "../../src/shared/ai/mail-assistant";
import { MailAssistantProviderError } from "./provider-types";

const mocks = vi.hoisted(() => ({
  openAiExecute: vi.fn(),
  openAiTestConnection: vi.fn(),
  anthropicExecute: vi.fn(),
  anthropicTestConnection: vi.fn(),
  ollamaExecute: vi.fn(),
  ollamaTestConnection: vi.fn(),
  ollamaListModels: vi.fn(),
  loadPersistedSettings: vi.fn<() => Promise<MailAssistantSettings | null>>(),
  loadPersistedSecrets: vi.fn(),
  savePersistedSettings: vi.fn(),
  savePersistedSecret: vi.fn()
}));

vi.mock("../runtime/runtime-config", () => ({
  getRuntimeConfigSummary: () => ({
    packaged: false,
    preferredConfigPath: "C:\\Users\\Daniel Victorino\\HyperMail\\.env",
    loadedConfigPath: null,
    searchPaths: [],
    googleOAuthReady: false,
    microsoftOAuthReady: false,
    openAiReady: false,
    anthropicReady: false,
    ollamaReady: false,
    updatesUrlConfigured: false,
    crashReportUploadConfigured: false
  })
}));

vi.mock("./ai-settings-store", () => ({
  loadPersistedMailAssistantSettings: mocks.loadPersistedSettings,
  loadPersistedMailAssistantSecrets: mocks.loadPersistedSecrets,
  savePersistedMailAssistantSettings: mocks.savePersistedSettings,
  savePersistedMailAssistantSecret: mocks.savePersistedSecret
}));

vi.mock("./providers/openai", () => ({
  openAiProviderAdapter: {
    execute: mocks.openAiExecute,
    testConnection: mocks.openAiTestConnection
  }
}));

vi.mock("./providers/anthropic", () => ({
  anthropicProviderAdapter: {
    execute: mocks.anthropicExecute,
    testConnection: mocks.anthropicTestConnection
  }
}));

vi.mock("./providers/ollama", () => ({
  ollamaProviderAdapter: {
    execute: mocks.ollamaExecute,
    testConnection: mocks.ollamaTestConnection,
    listModels: mocks.ollamaListModels
  }
}));

import { saveMailAssistantSettings, summarizeThread } from "./mail-assistant-service";

describe("mail-assistant-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.loadPersistedSecrets.mockResolvedValue({
      openai: "sk-openai",
      anthropic: "sk-anthropic"
    });
    mocks.loadPersistedSettings.mockResolvedValue(createDefaultMailAssistantSettings());
  });

  it("uses the primary provider when it succeeds", async () => {
    mocks.openAiExecute.mockResolvedValue({
      provider: "openai",
      model: "gpt-5.4-mini",
      data: {
        headline: "Launch review is ready.",
        bullets: ["Condensed the narrative.", "Waiting on Maya's reply."],
        actionItems: [],
        replyRecommendation: "No reply needed yet."
      }
    });

    const result = await summarizeThread({
      thread: {
        accountId: "google:daniel@example.com",
        accountEmail: "daniel@example.com",
        threadId: "thread-1",
        subject: "Launch review",
        snippet: "Can you tighten the narrative?",
        split: "important",
        participantNames: ["Daniel", "Maya"],
        participantEmails: ["daniel@example.com", "maya@example.com"],
        messages: []
      }
    });

    expect(result.provider).toBe("openai");
    expect(result.fallbackUsed).toBe(false);
    expect(mocks.openAiExecute).toHaveBeenCalledTimes(1);
    expect(mocks.anthropicExecute).not.toHaveBeenCalled();
  });

  it("falls back to the secondary provider on a fallback-eligible failure", async () => {
    mocks.openAiExecute.mockRejectedValue(
      new MailAssistantProviderError({
        provider: "openai",
        code: "not-configured",
        message: "OpenAI API key is missing."
      })
    );
    mocks.anthropicExecute.mockResolvedValue({
      provider: "anthropic",
      model: "claude-sonnet-4-20250514",
      data: {
        headline: "Launch review is ready.",
        bullets: ["Condensed the narrative.", "Waiting on Maya's reply."],
        actionItems: [],
        replyRecommendation: "No reply needed yet."
      }
    });

    const result = await summarizeThread({
      thread: {
        accountId: "google:daniel@example.com",
        accountEmail: "daniel@example.com",
        threadId: "thread-1",
        subject: "Launch review",
        snippet: "Can you tighten the narrative?",
        split: "important",
        participantNames: ["Daniel", "Maya"],
        participantEmails: ["daniel@example.com", "maya@example.com"],
        messages: []
      }
    });

    expect(result.provider).toBe("anthropic");
    expect(result.fallbackUsed).toBe(true);
    expect(mocks.openAiExecute).toHaveBeenCalledTimes(1);
    expect(mocks.anthropicExecute).toHaveBeenCalledTimes(1);
  });

  it("does not use the fallback provider when the primary refuses the request", async () => {
    mocks.openAiExecute.mockRejectedValue(
      new MailAssistantProviderError({
        provider: "openai",
        code: "refusal",
        message: "The request was refused."
      })
    );

    await expect(
      summarizeThread({
        thread: {
          accountId: "google:daniel@example.com",
          accountEmail: "daniel@example.com",
          threadId: "thread-1",
          subject: "Launch review",
          snippet: "Can you tighten the narrative?",
          split: "important",
          participantNames: ["Daniel", "Maya"],
          participantEmails: ["daniel@example.com", "maya@example.com"],
          messages: []
        }
      })
    ).rejects.toThrow("The request was refused.");

    expect(mocks.openAiExecute).toHaveBeenCalledTimes(1);
    expect(mocks.anthropicExecute).not.toHaveBeenCalled();
  });

  it("persists non-secret settings and leaves secrets untouched when not replaced", async () => {
    await saveMailAssistantSettings({
      primaryProvider: "anthropic",
      fallbackProvider: "ollama",
      providers: {
        openai: {
          model: "gpt-5.4-mini",
          presetId: "balanced",
          temperature: null,
          maxOutputTokens: null,
          baseUrl: null
        },
        anthropic: {
          model: "claude-sonnet-4-20250514",
          presetId: "quality",
          temperature: null,
          maxOutputTokens: null,
          baseUrl: null
        },
        ollama: {
          model: "llama3.2",
          presetId: "balanced",
          temperature: null,
          maxOutputTokens: null,
          baseUrl: "http://127.0.0.1:11434"
        }
      }
    });

    expect(mocks.savePersistedSettings).toHaveBeenCalledTimes(1);
    expect(mocks.savePersistedSecret).not.toHaveBeenCalled();
  });
});
