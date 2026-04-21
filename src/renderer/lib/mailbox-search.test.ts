import { describe, expect, it } from "vitest";
import type { ThreadProjection } from "@shared/mail/models";
import { searchThreads } from "./mailbox-search";

function createThreadProjection(
  id: string,
  overrides: Partial<ThreadProjection["thread"]> = {},
  bodyPlain = "Default body copy."
): ThreadProjection {
  const thread = {
    id,
    accountId: "account-1",
    subject: overrides.subject ?? "Thread",
    snippet: overrides.snippet ?? "Snippet",
    participantNames: overrides.participantNames ?? ["Ada"],
    participantEmails: overrides.participantEmails ?? ["ada@example.com"],
    split: overrides.split ?? "important",
    unread: overrides.unread ?? false,
    starred: overrides.starred ?? false,
    archived: overrides.archived ?? false,
    snoozedUntil: overrides.snoozedUntil ?? null,
    unsubscribe: overrides.unsubscribe ?? null,
    unsubscribedAt: overrides.unsubscribedAt ?? null,
    lastMessageAt: overrides.lastMessageAt ?? Date.now(),
    messageIds: [`${id}:message-1`],
    updatedAt: overrides.updatedAt ?? Date.now()
  };

  return {
    thread,
    messages: [
      {
        id: `${id}:message-1`,
        accountId: "account-1",
        threadId: id,
        subject: thread.subject,
        fromName: thread.participantNames[0] ?? "Ada",
        fromEmail: thread.participantEmails[0] ?? "ada@example.com",
        to: ["daniel@example.com"],
        cc: [],
        bodyPlain,
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

describe("searchThreads", () => {
  const threads = [
    createThreadProjection(
      "thread-launch",
      {
        subject: "Launch review before customer demo",
        participantNames: ["Maya Chen"],
        participantEmails: ["maya@example.com"],
        lastMessageAt: 10
      },
      "Can you tighten the launch note before tomorrow's demo?"
    ),
    createThreadProjection(
      "thread-roadmap",
      {
        subject: "Roadmap checkpoint for offline architecture",
        participantNames: ["Noah Patel"],
        participantEmails: ["noah@example.com"],
        lastMessageAt: 20
      },
      "Per-thread queues keep the mailbox deterministic."
    ),
    createThreadProjection(
      "thread-digest",
      {
        subject: "Weekly product digest",
        participantNames: ["Orbit News"],
        participantEmails: ["digest@example.com"],
        lastMessageAt: 30
      },
      "This digest includes product updates and release notes."
    )
  ];

  it("prefers subject and participant matches over weaker body hits", () => {
    const results = searchThreads(threads, "maya launch");

    expect(results[0]?.thread.id).toBe("thread-launch");
  });

  it("finds threads by message body when subject and sender do not match", () => {
    const results = searchThreads(threads, "deterministic mailbox");

    expect(results.map((thread) => thread.thread.id)).toEqual(["thread-roadmap"]);
  });

  it("returns no results when not all tokens match", () => {
    const results = searchThreads(threads, "orbit demo");

    expect(results).toEqual([]);
  });
});
