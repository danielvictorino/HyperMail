import { describe, expect, it } from "vitest";
import {
  IpcValidationError,
  gmailMailboxSyncRequestSchema,
  isAllowedExternalUrl,
  listOllamaModelsRequestSchema,
  parseIpcPayload,
  saveMailAssistantSettingsRequestSchema,
  sendDraftRequestSchema,
  setThreadStarredRequestSchema,
  testMailAssistantProviderConnectionRequestSchema,
  unsubscribeThreadRequestSchema
} from "./ipc-contracts";

describe("ipc-contracts", () => {
  describe("gmailMailboxSyncRequestSchema", () => {
    it("accepts a minimal valid payload", () => {
      const result = parseIpcPayload(
        "mail:sync-gmail-mailbox",
        gmailMailboxSyncRequestSchema,
        { accountId: "acc-123" }
      );
      expect(result.accountId).toBe("acc-123");
    });

    it("rejects missing accountId", () => {
      expect(() =>
        parseIpcPayload("mail:sync-gmail-mailbox", gmailMailboxSyncRequestSchema, {})
      ).toThrow(IpcValidationError);
    });

    it("rejects negative maxResults", () => {
      expect(() =>
        parseIpcPayload("mail:sync-gmail-mailbox", gmailMailboxSyncRequestSchema, {
          accountId: "a",
          maxResults: -1
        })
      ).toThrow(IpcValidationError);
    });
  });

  describe("setThreadStarredRequestSchema", () => {
    it("rejects wrong starred type", () => {
      expect(() =>
        parseIpcPayload("mail:set-thread-starred", setThreadStarredRequestSchema, {
          accountId: "a",
          threadId: "t",
          starred: "yes",
          idempotencyKey: "k"
        })
      ).toThrow(IpcValidationError);
    });
  });

  describe("unsubscribeThreadRequestSchema", () => {
    it("rejects non-https endpoint", () => {
      expect(() =>
        parseIpcPayload(
          "mail:unsubscribe-gmail-thread",
          unsubscribeThreadRequestSchema,
          {
            accountId: "a",
            threadId: "t",
            idempotencyKey: "k",
            unsubscribe: {
              method: "http-get",
              endpoint: "http://insecure.example/u",
              oneClick: true,
              sourceMessageId: "m"
            }
          }
        )
      ).toThrow(IpcValidationError);
    });

    it("accepts a mailto endpoint", () => {
      const parsed = parseIpcPayload(
        "mail:unsubscribe-gmail-thread",
        unsubscribeThreadRequestSchema,
        {
          accountId: "a",
          threadId: "t",
          idempotencyKey: "k",
          unsubscribe: {
            method: "mailto",
            endpoint: "mailto:unsub@example.com",
            oneClick: false,
            sourceMessageId: "m"
          }
        }
      );
      expect(parsed.unsubscribe.method).toBe("mailto");
    });
  });

  describe("sendDraftRequestSchema", () => {
    it("rejects invalid email in to[]", () => {
      expect(() =>
        parseIpcPayload("mail:send-gmail-draft", sendDraftRequestSchema, {
          accountId: "a",
          draftId: "d",
          threadId: "t",
          clientMessageId: "c",
          to: ["not-an-email"],
          cc: [],
          bcc: [],
          subject: "hi",
          bodyHtml: "<p>hi</p>"
        })
      ).toThrow(IpcValidationError);
    });
  });

  describe("mail assistant settings", () => {
    it("accepts an http Ollama base url", () => {
      const parsed = parseIpcPayload(
        "ai:list-ollama-models",
        listOllamaModelsRequestSchema,
        {
          baseUrl: "http://127.0.0.1:11434"
        }
      );

      expect(parsed.baseUrl).toBe("http://127.0.0.1:11434");
    });

    it("rejects fallback provider matching the primary provider", () => {
      expect(() =>
        parseIpcPayload("ai:save-settings", saveMailAssistantSettingsRequestSchema, {
          settings: {
            primaryProvider: "openai",
            fallbackProvider: "openai",
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
                presetId: "balanced",
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
          }
        })
      ).toThrow(IpcValidationError);
    });

    it("accepts a provider connection test payload", () => {
      const parsed = parseIpcPayload(
        "ai:test-provider-connection",
        testMailAssistantProviderConnectionRequestSchema,
        {
          provider: "anthropic",
          settings: {
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
                temperature: 0.3,
                maxOutputTokens: 512,
                baseUrl: null,
                apiKey: "sk-ant-test"
              },
              ollama: {
                model: "llama3.2",
                presetId: "balanced",
                temperature: null,
                maxOutputTokens: null,
                baseUrl: "http://127.0.0.1:11434"
              }
            }
          }
        }
      );

      expect(parsed.provider).toBe("anthropic");
      expect(parsed.settings.providers.anthropic.presetId).toBe("quality");
    });
  });

  describe("fuzz / hostile payloads", () => {
    it("rejects prototype-pollution-shaped keys gracefully", () => {
      const hostile = JSON.parse('{"accountId":"a","__proto__":{"polluted":true}}');
      const parsed = parseIpcPayload(
        "mail:sync-gmail-mailbox",
        gmailMailboxSyncRequestSchema,
        hostile
      );
      expect(parsed.accountId).toBe("a");
      expect((Object.prototype as Record<string, unknown>).polluted).toBeUndefined();
    });

    it("rejects strings that exceed max length", () => {
      const oversized = "x".repeat(10_000);
      expect(() =>
        parseIpcPayload("mail:send-gmail-draft", sendDraftRequestSchema, {
          accountId: oversized,
          draftId: "d",
          threadId: "t",
          clientMessageId: "c",
          to: ["a@b.com"],
          cc: [],
          bcc: [],
          subject: "",
          bodyHtml: ""
        })
      ).toThrow(IpcValidationError);
    });

    it("rejects array where a scalar is expected", () => {
      expect(() =>
        parseIpcPayload("mail:set-thread-starred", setThreadStarredRequestSchema, {
          accountId: ["a"],
          threadId: "t",
          starred: true,
          idempotencyKey: "k"
        })
      ).toThrow(IpcValidationError);
    });

    it("rejects null payload", () => {
      expect(() =>
        parseIpcPayload("mail:sync-gmail-mailbox", gmailMailboxSyncRequestSchema, null)
      ).toThrow(IpcValidationError);
    });

    it("rejects unsubscribe endpoint containing javascript: scheme", () => {
      expect(() =>
        parseIpcPayload(
          "mail:unsubscribe-gmail-thread",
          unsubscribeThreadRequestSchema,
          {
            accountId: "a",
            threadId: "t",
            idempotencyKey: "k",
            unsubscribe: {
              method: "http-get",
              endpoint: "javascript:alert(1)",
              oneClick: true,
              sourceMessageId: "m"
            }
          }
        )
      ).toThrow(IpcValidationError);
    });
  });

  describe("isAllowedExternalUrl", () => {
    it("allows https", () => {
      expect(isAllowedExternalUrl("https://example.com")).toBe(true);
    });
    it("allows mailto", () => {
      expect(isAllowedExternalUrl("mailto:a@b.com")).toBe(true);
    });
    it("blocks file scheme", () => {
      expect(isAllowedExternalUrl("file:///etc/passwd")).toBe(false);
    });
    it("blocks javascript scheme", () => {
      expect(isAllowedExternalUrl("javascript:alert(1)")).toBe(false);
    });
    it("blocks http", () => {
      expect(isAllowedExternalUrl("http://example.com")).toBe(false);
    });
    it("blocks malformed URLs", () => {
      expect(isAllowedExternalUrl("not a url")).toBe(false);
    });
  });
});
