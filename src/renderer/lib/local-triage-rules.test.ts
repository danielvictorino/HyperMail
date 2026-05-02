import { describe, expect, it } from "vitest";
import type { ThreadSnapshot } from "@shared/mail/models";
import { suggestLocalTriageSplit } from "./local-triage-rules";

function createSnapshot(overrides: Partial<ThreadSnapshot["thread"]>): ThreadSnapshot {
  const thread = {
    id: "thread-1",
    accountId: "account-1",
    subject: "Customer demo tomorrow",
    snippet: "Need a quick review.",
    participantNames: ["Maya"],
    participantEmails: ["maya@example.com"],
    split: "other" as const,
    unread: false,
    starred: false,
    archived: false,
    snoozedUntil: null,
    unsubscribe: null,
    unsubscribedAt: null,
    lastMessageAt: 1000,
    messageIds: ["message-1"],
    updatedAt: 1000,
    ...overrides
  };

  return {
    thread,
    messages: [
      {
        id: "message-1",
        accountId: thread.accountId,
        threadId: thread.id,
        subject: thread.subject,
        fromName: "Maya",
        fromEmail: thread.participantEmails[0] ?? "maya@example.com",
        to: ["daniel@example.com"],
        cc: [],
        bodyPlain: thread.snippet,
        unread: false,
        starred: false,
        archived: false,
        labelIds: ["INBOX"],
        attachments: [],
        sentAt: thread.lastMessageAt
      }
    ]
  };
}

describe("local triage rules", () => {
  it("promotes known founder/operator domains to VIP", () => {
    const suggestion = suggestLocalTriageSplit(
      createSnapshot({
        participantEmails: ["maya@galaxies.ai", "daniel@example.com"]
      })
    );

    expect(suggestion?.split).toBe("vip");
  });

  it("marks customer and launch language as important", () => {
    const suggestion = suggestLocalTriageSplit(createSnapshot({}));

    expect(suggestion?.split).toBe("important");
  });

  it("keeps newsletter-style mail in Other", () => {
    const suggestion = suggestLocalTriageSplit(
      createSnapshot({
        subject: "Weekly newsletter",
        snippet: "Digest and unsubscribe links inside."
      })
    );

    expect(suggestion?.split).toBe("other");
  });
});
