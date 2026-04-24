import { describe, expect, it } from "vitest";
import type { ThreadProjection } from "@shared/mail/models";
import { filterThreadsBySection, getMailboxNavItems } from "./mailbox-view";

function createThread(
  overrides: Partial<ThreadProjection["thread"]>
): ThreadProjection {
  const thread = {
    id: overrides.id ?? crypto.randomUUID(),
    accountId: "account-1",
    subject: overrides.subject ?? "Thread",
    snippet: "Snippet",
    participantNames: ["Ada"],
    participantEmails: ["ada@example.com"],
    split: overrides.split ?? "important",
    unread: overrides.unread ?? false,
    starred: overrides.starred ?? false,
    archived: overrides.archived ?? false,
    snoozedUntil: overrides.snoozedUntil ?? null,
    unsubscribe: overrides.unsubscribe ?? null,
    unsubscribedAt: overrides.unsubscribedAt ?? null,
    lastMessageAt: overrides.lastMessageAt ?? Date.now(),
    messageIds: ["message-1"],
    updatedAt: Date.now()
  };

  return {
    thread,
    messages: [
      {
        id: "message-1",
        accountId: "account-1",
        threadId: thread.id,
        subject: thread.subject,
        fromName: "Ada",
        fromEmail: "ada@example.com",
        to: ["alex@example.com"],
        cc: [],
        bodyPlain: "Hello",
        unread: thread.unread,
        starred: thread.starred,
        archived: thread.archived,
        labelIds: ["INBOX"],
        attachments: [],
        deliveryState: "sent",
        sentAt: thread.lastMessageAt
      }
    ],
    queueDepth: 0,
    pendingModifierIds: [],
    pendingModifierTypes: []
  };
}

describe("mailbox-view", () => {
  const threads = [
    createThread({ id: "t1", split: "important", unread: true }),
    createThread({ id: "t2", split: "vip", starred: true }),
    createThread({ id: "t3", split: "other", archived: true }),
    createThread({ id: "t4", split: "important", starred: true }),
    createThread({
      id: "t5",
      split: "other",
      snoozedUntil: Date.now() + 60 * 60 * 1000
    })
  ];

  it("builds navigation counts for sections", () => {
    const navItems = getMailboxNavItems(threads);
    const inbox = navItems.find((item) => item.id === "inbox");
    const starred = navItems.find((item) => item.id === "starred");
    const snoozed = navItems.find((item) => item.id === "snoozed");
    const archive = navItems.find((item) => item.id === "archive");

    expect(inbox?.count).toBe(3);
    expect(inbox?.unreadCount).toBe(1);
    expect(starred?.count).toBe(2);
    expect(snoozed?.count).toBe(1);
    expect(archive?.count).toBe(1);
  });

  it("filters threads by section without mixing archive into inbox", () => {
    expect(
      filterThreadsBySection(threads, "inbox").map((thread) => thread.thread.id)
    ).toEqual(["t1", "t2", "t4"]);
    expect(
      filterThreadsBySection(threads, "snoozed").map((thread) => thread.thread.id)
    ).toEqual(["t5"]);
    expect(
      filterThreadsBySection(threads, "archive").map((thread) => thread.thread.id)
    ).toEqual(["t3"]);
    expect(
      filterThreadsBySection(threads, "vip").map((thread) => thread.thread.id)
    ).toEqual(["t2"]);
  });
});
