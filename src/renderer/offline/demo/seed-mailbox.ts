import type { MailAccountDescriptor } from "@shared/mail/models";
import { hypermailDb } from "../db/hypermail-db";

export const DEMO_ACCOUNT: MailAccountDescriptor = {
  id: "demo:hypermail",
  email: "demo@hypermail.local",
  displayName: "HyperMail Demo",
  provider: "demo",
  connectedAt: Date.now()
};

function createThreadId(accountId: string, suffix: string): string {
  return `${accountId}:thread:${suffix}`;
}

function createMessageId(accountId: string, suffix: string): string {
  return `${accountId}:message:${suffix}`;
}

export async function ensureSeededMailbox(
  descriptor: MailAccountDescriptor
): Promise<void> {
  const now = Date.now();
  const digestThread = {
    id: createThreadId(descriptor.id, "digest"),
    accountId: descriptor.id,
    subject: "Weekly product digest",
    snippet: "You can unsubscribe instantly if this cadence is too noisy.",
    participantNames: ["Orbit News"],
    participantEmails: ["digest@orbit.example"],
    split: "other" as const,
    unread: false,
    starred: false,
    archived: false,
    snoozedUntil: null,
    unsubscribe: {
      method: "mailto" as const,
      endpoint: "mailto:unsubscribe@orbit.example?subject=unsubscribe",
      oneClick: false,
      sourceMessageId: createMessageId(descriptor.id, "digest-1"),
      mailto: {
        to: ["unsubscribe@orbit.example"],
        subject: "unsubscribe"
      }
    },
    unsubscribedAt: null,
    lastMessageAt: now - 1000 * 60 * 210,
    messageIds: [createMessageId(descriptor.id, "digest-1")],
    updatedAt: now - 1000 * 60 * 210
  };
  const digestMessage = {
    id: createMessageId(descriptor.id, "digest-1"),
    accountId: descriptor.id,
    threadId: createThreadId(descriptor.id, "digest"),
    subject: "Weekly product digest",
    fromName: "Orbit News",
    fromEmail: "digest@orbit.example",
    to: [descriptor.email],
    cc: [],
    bodyPlain:
      "This is the low-value mailing-list case HyperMail should handle without leaving the keyboard. Use U to unsubscribe locally, queue it offline, and archive the thread.",
    unread: false,
    starred: false,
    archived: false,
    labelIds: ["INBOX"],
    attachments: [],
    sentAt: now - 1000 * 60 * 210
  };

  await hypermailDb.accounts.put({
    id: descriptor.id,
    email: descriptor.email,
    displayName: descriptor.displayName,
    provider: descriptor.provider,
    connectedAt: descriptor.connectedAt,
    updatedAt: now
  });

  if (descriptor.provider !== "demo") {
    return;
  }

  const existingThreadCount = await hypermailDb.threads
    .where("accountId")
    .equals(descriptor.id)
    .count();

  if (existingThreadCount > 0) {
    const existingDigestThread = await hypermailDb.threads.get(digestThread.id);

    if (!existingDigestThread) {
      await hypermailDb.transaction(
        "rw",
        hypermailDb.threads,
        hypermailDb.messages,
        async () => {
          await hypermailDb.threads.put(digestThread);
          await hypermailDb.messages.put(digestMessage);
        }
      );
    }

    return;
  }

  const labels = [
    { id: `${descriptor.id}:label:inbox`, name: "Inbox", color: "#6b7280", kind: "system" as const },
    { id: `${descriptor.id}:label:starred`, name: "Starred", color: "#a27eff", kind: "system" as const },
    { id: `${descriptor.id}:label:vip`, name: "VIP", color: "#d97706", kind: "system" as const },
    { id: `${descriptor.id}:label:calendar`, name: "Calendar", color: "#0ea5e9", kind: "user" as const }
  ].map((label) => ({
    ...label,
    accountId: descriptor.id
  }));

  const threads = [
    {
      id: createThreadId(descriptor.id, "launch"),
      accountId: descriptor.id,
      subject: "Launch review before tomorrow’s customer demo",
      snippet: "The deck is tight. I only need the short version of the narrative for slide five.",
      participantNames: ["Maya Chen", descriptor.displayName],
      participantEmails: ["maya@galaxies.ai", descriptor.email],
      split: "important" as const,
      unread: true,
      starred: true,
      archived: false,
      snoozedUntil: null,
      unsubscribe: null,
      unsubscribedAt: null,
      lastMessageAt: now - 1000 * 60 * 18,
      messageIds: [
        createMessageId(descriptor.id, "launch-1"),
        createMessageId(descriptor.id, "launch-2")
      ],
      updatedAt: now - 1000 * 60 * 18
    },
    {
      id: createThreadId(descriptor.id, "roadmap"),
      accountId: descriptor.id,
      subject: "Roadmap checkpoint for offline architecture",
      snippet: "Per-thread queues are the right call. We should keep rollback as replay, not mutation reversal.",
      participantNames: ["Noah Patel", descriptor.displayName],
      participantEmails: ["noah@hypermail.dev", descriptor.email],
      split: "vip" as const,
      unread: false,
      starred: false,
      archived: false,
      snoozedUntil: null,
      unsubscribe: null,
      unsubscribedAt: null,
      lastMessageAt: now - 1000 * 60 * 52,
      messageIds: [createMessageId(descriptor.id, "roadmap-1")],
      updatedAt: now - 1000 * 60 * 52
    },
    {
      id: createThreadId(descriptor.id, "calendar"),
      accountId: descriptor.id,
      subject: "Calendar sync edge-cases when the network flakes",
      snippet: "If the user edits offline, the newest committed version should win after reconnect.",
      participantNames: ["Jules Rivera", descriptor.displayName],
      participantEmails: ["jules@ops.example", descriptor.email],
      split: "other" as const,
      unread: false,
      starred: false,
      archived: false,
      snoozedUntil: now + 1000 * 60 * 60 * 18,
      unsubscribe: null,
      unsubscribedAt: null,
      lastMessageAt: now - 1000 * 60 * 140,
      messageIds: [
        createMessageId(descriptor.id, "calendar-1"),
        createMessageId(descriptor.id, "calendar-2")
      ],
      updatedAt: now - 1000 * 60 * 140
    },
    digestThread
  ];

  const messages = [
    {
      id: createMessageId(descriptor.id, "launch-1"),
      accountId: descriptor.id,
      threadId: createThreadId(descriptor.id, "launch"),
      subject: "Launch review before tomorrow’s customer demo",
      fromName: "Maya Chen",
      fromEmail: "maya@galaxies.ai",
      to: [descriptor.email],
      cc: [],
      bodyPlain:
        "Deck is in great shape. I only need the short version of the narrative for slide five so I can tighten the customer story before tomorrow.",
      unread: false,
      starred: true,
      archived: false,
      labelIds: ["INBOX", "STARRED"],
      attachments: [
        {
          id: `${descriptor.id}:attachment:launch-outline`,
          filename: "launch-outline.pdf",
          mimeType: "application/pdf",
          size: 245760,
          cacheState: "not-cached" as const
        }
      ],
      sentAt: now - 1000 * 60 * 45
    },
    {
      id: createMessageId(descriptor.id, "launch-2"),
      accountId: descriptor.id,
      threadId: createThreadId(descriptor.id, "launch"),
      subject: "Re: Launch review before tomorrow’s customer demo",
      fromName: descriptor.displayName,
      fromEmail: descriptor.email,
      to: ["maya@galaxies.ai"],
      cc: [],
      bodyPlain:
        "I’ll condense slide five into a single problem frame, one metric, and one proof point. HyperMail’s offline queue can be the architecture example.",
      unread: true,
      starred: true,
      archived: false,
      labelIds: ["INBOX", "STARRED"],
      attachments: [],
      sentAt: now - 1000 * 60 * 18
    },
    {
      id: createMessageId(descriptor.id, "roadmap-1"),
      accountId: descriptor.id,
      threadId: createThreadId(descriptor.id, "roadmap"),
      subject: "Roadmap checkpoint for offline architecture",
      fromName: "Noah Patel",
      fromEmail: "noah@hypermail.dev",
      to: [descriptor.email],
      cc: [],
      bodyPlain:
        "Per-thread queues are the right call. Keep rollback as replay of base cache plus remaining modifiers so the UI stays deterministic.",
      unread: false,
      starred: false,
      archived: false,
      labelIds: ["INBOX", "VIP"],
      attachments: [],
      sentAt: now - 1000 * 60 * 52
    },
    {
      id: createMessageId(descriptor.id, "calendar-1"),
      accountId: descriptor.id,
      threadId: createThreadId(descriptor.id, "calendar"),
      subject: "Calendar sync edge-cases when the network flakes",
      fromName: "Jules Rivera",
      fromEmail: "jules@ops.example",
      to: [descriptor.email],
      cc: [],
      bodyPlain:
        "If the user edits offline, the newest committed version should win after reconnect. We only need the action log to be ordered and replayable.",
      unread: false,
      starred: false,
      archived: false,
      labelIds: ["INBOX", "CALENDAR"],
      attachments: [],
      sentAt: now - 1000 * 60 * 165
    },
    {
      id: createMessageId(descriptor.id, "calendar-2"),
      accountId: descriptor.id,
      threadId: createThreadId(descriptor.id, "calendar"),
      subject: "Re: Calendar sync edge-cases when the network flakes",
      fromName: descriptor.displayName,
      fromEmail: descriptor.email,
      to: ["jules@ops.example"],
      cc: [],
      bodyPlain:
        "Agreed. For HyperMail I’m treating queued actions as the source of optimistic truth, then committing them into the base cache after persistence succeeds.",
      unread: false,
      starred: false,
      archived: false,
      labelIds: ["INBOX", "CALENDAR"],
      attachments: [],
      sentAt: now - 1000 * 60 * 140
    },
    digestMessage
  ];

  await hypermailDb.transaction(
    "rw",
    hypermailDb.labels,
    hypermailDb.threads,
    hypermailDb.messages,
    async () => {
      await hypermailDb.labels.bulkPut(labels);
      await hypermailDb.threads.bulkPut(threads);
      await hypermailDb.messages.bulkPut(messages);
    }
  );
}
