import { describe, expect, it } from "vitest";
import {
  IpcValidationError,
  gmailMailboxSyncRequestSchema,
  isAllowedExternalUrl,
  parseIpcPayload,
  sendDraftRequestSchema,
  setThreadStarredRequestSchema,
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
