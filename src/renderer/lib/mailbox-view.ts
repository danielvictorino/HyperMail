import type { DraftSummary, ThreadProjection } from "@shared/mail/models";
import type { MailboxSectionId } from "../state/inbox-ui-store";

export interface MailboxNavItem {
  id: MailboxSectionId;
  label: string;
  count: number;
  unreadCount: number;
}

export interface SenderInsight {
  company: string;
  strength: string;
  relationship: string;
  responseTimeLabel: string;
}

export interface CalendarContext {
  title: string;
  timeLabel: string;
  detail: string;
}

export interface DailyBrief {
  actionNeededCount: number;
  importantUnreadCount: number;
  waitingCount: number;
  draftCount: number;
  failedSendCount: number;
  topActionLabel: string;
  topActionDetail: string;
}

export function isThreadActivelySnoozed(
  thread: Pick<ThreadProjection["thread"], "snoozedUntil">
): boolean {
  return Boolean(thread.snoozedUntil && thread.snoozedUntil > Date.now());
}

export function formatSnoozedUntil(timestamp: number): string {
  return new Date(timestamp).toLocaleString([], {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit"
  });
}

export function getMailboxNavItems(threads: ThreadProjection[]): MailboxNavItem[] {
  return [
    createNavItem("inbox", "Inbox", threads),
    createNavItem("important", "Important", threads),
    createNavItem("vip", "VIP", threads),
    createNavItem("waiting", "Waiting", threads),
    createNavItem("other", "Other", threads),
    createNavItem("starred", "Starred", threads),
    createNavItem("snoozed", "Snoozed", threads),
    createNavItem("archive", "Archive", threads)
  ];
}

export function filterThreadsBySection(
  threads: ThreadProjection[],
  section: MailboxSectionId
): ThreadProjection[] {
  switch (section) {
    case "inbox":
      return threads.filter(
        (thread) => !thread.thread.archived && !isThreadActivelySnoozed(thread.thread)
      );
    case "important":
      return threads.filter(
        (thread) =>
          !thread.thread.archived &&
          !isThreadActivelySnoozed(thread.thread) &&
          thread.thread.split === "important"
      );
    case "vip":
      return threads.filter(
        (thread) =>
          !thread.thread.archived &&
          !isThreadActivelySnoozed(thread.thread) &&
          thread.thread.split === "vip"
      );
    case "waiting":
      return threads.filter(
        (thread) =>
          !thread.thread.archived &&
          !isThreadActivelySnoozed(thread.thread) &&
          isThreadWaitingForReply(thread)
      );
    case "other":
      return threads.filter(
        (thread) =>
          !thread.thread.archived &&
          !isThreadActivelySnoozed(thread.thread) &&
          thread.thread.split === "other"
      );
    case "starred":
      return threads.filter(
        (thread) =>
          !thread.thread.archived &&
          !isThreadActivelySnoozed(thread.thread) &&
          thread.thread.starred
      );
    case "snoozed":
      return threads.filter((thread) => isThreadActivelySnoozed(thread.thread));
    case "archive":
      return threads.filter(
        (thread) => thread.thread.archived && !isThreadActivelySnoozed(thread.thread)
      );
    default:
      return threads;
  }
}

export function getSectionHeadline(section: MailboxSectionId): string {
  switch (section) {
    case "inbox":
      return "All inbox";
    case "important":
      return "Important split";
    case "vip":
      return "VIP split";
    case "waiting":
      return "Waiting for reply";
    case "other":
      return "Other split";
    case "starred":
      return "Starred threads";
    case "snoozed":
      return "Snoozed";
    case "archive":
      return "Archive";
    default:
      return "Inbox";
  }
}

export function getSectionDescription(section: MailboxSectionId): string {
  switch (section) {
    case "inbox":
      return "Everything active in the local cache, replayed with queued modifiers.";
    case "important":
      return "High-priority threads that should land above the fold.";
    case "vip":
      return "People you want to answer fast, with extra context in the right rail.";
    case "waiting":
      return "Sent threads where your last message is still the newest committed mail.";
    case "other":
      return "Lower-pressure conversations kept nearby, but not in the primary lane.";
    case "starred":
      return "Pinned threads surfaced from local state first, not network round trips.";
    case "snoozed":
      return "Threads paused until a specific time, hidden from the working set but still local and instant.";
    case "archive":
      return "Threads removed from the working set but still instant to inspect.";
    default:
      return "";
  }
}

export function isThreadWaitingForReply(thread: ThreadProjection): boolean {
  return Boolean(thread.waitingForReply && thread.waitingSince);
}

export function buildDailyBrief(
  threads: ThreadProjection[],
  draftSummary: DraftSummary
): DailyBrief {
  const activeThreads = threads.filter(
    (thread) => !thread.thread.archived && !isThreadActivelySnoozed(thread.thread)
  );
  const actionNeededThreads = activeThreads.filter(
    (thread) => thread.actionNeeded || thread.thread.unread
  );
  const importantUnreadCount = activeThreads.filter(
    (thread) =>
      thread.thread.unread &&
      (thread.thread.split === "vip" || thread.thread.split === "important")
  ).length;
  const waitingCount = activeThreads.filter(isThreadWaitingForReply).length;

  if (draftSummary.failed > 0) {
    return {
      actionNeededCount: actionNeededThreads.length,
      importantUnreadCount,
      waitingCount,
      draftCount: draftSummary.draft,
      failedSendCount: draftSummary.failed,
      topActionLabel: "Fix failed sends",
      topActionDetail: `${draftSummary.failed} local outbox item${draftSummary.failed === 1 ? "" : "s"} need attention before more triage.`
    };
  }

  if (importantUnreadCount > 0) {
    return {
      actionNeededCount: actionNeededThreads.length,
      importantUnreadCount,
      waitingCount,
      draftCount: draftSummary.draft,
      failedSendCount: draftSummary.failed,
      topActionLabel: "Clear important unread",
      topActionDetail: `${importantUnreadCount} VIP or Important thread${importantUnreadCount === 1 ? "" : "s"} are unread in the working set.`
    };
  }

  if (waitingCount > 0) {
    return {
      actionNeededCount: actionNeededThreads.length,
      importantUnreadCount,
      waitingCount,
      draftCount: draftSummary.draft,
      failedSendCount: draftSummary.failed,
      topActionLabel: "Review waiting replies",
      topActionDetail: `${waitingCount} sent thread${waitingCount === 1 ? "" : "s"} have not received a newer reply.`
    };
  }

  return {
    actionNeededCount: actionNeededThreads.length,
    importantUnreadCount,
    waitingCount,
    draftCount: draftSummary.draft,
    failedSendCount: draftSummary.failed,
    topActionLabel: "Working set is calm",
    topActionDetail:
      "No failed sends, important unread, or waiting follow-ups stand out."
  };
}

export function formatThreadTimestamp(timestamp: number): string {
  const diffMinutes = Math.max(1, Math.round((Date.now() - timestamp) / 60000));

  if (diffMinutes < 60) {
    return `${diffMinutes}m`;
  }

  const diffHours = Math.round(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours}h`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d`;
}

export function buildSenderInsight(
  thread: ThreadProjection | null
): SenderInsight | null {
  if (!thread) {
    return null;
  }

  const primaryEmail =
    thread.thread.participantEmails.find(
      (email) => !email.endsWith("@hypermail.local")
    ) ??
    thread.thread.participantEmails[0] ??
    "unknown@example.com";
  const domain = primaryEmail.split("@")[1] ?? "example.com";
  const company = toCompanyName(domain);

  return {
    company,
    strength:
      thread.thread.split === "vip"
        ? "High-context relationship"
        : thread.thread.split === "important"
          ? "Active working thread"
          : "Warm contact",
    relationship: `${thread.thread.participantNames[0] ?? "Contact"} typically gets a response inside the same working block.`,
    responseTimeLabel:
      thread.thread.split === "vip" ? "~12 min median" : "~45 min median"
  };
}

export function buildCalendarContext(
  thread: ThreadProjection | null
): CalendarContext[] {
  if (!thread) {
    return [];
  }

  const base = new Date(thread.thread.lastMessageAt);
  const primaryPerson = thread.thread.participantNames[0] ?? "Contact";

  return [
    {
      title: `Follow up with ${primaryPerson}`,
      timeLabel: formatCalendarTime(addHours(base, 2)),
      detail: "Best slot for a concise reply or send-later action."
    },
    {
      title: "Inbox zero review",
      timeLabel: formatCalendarTime(addHours(base, 6)),
      detail: "Good moment to clear the remainder of this split."
    }
  ];
}

function createNavItem(
  id: MailboxSectionId,
  label: string,
  threads: ThreadProjection[]
): MailboxNavItem {
  const filtered = filterThreadsBySection(threads, id);

  return {
    id,
    label,
    count: filtered.length,
    unreadCount: filtered.filter((thread) => thread.thread.unread).length
  };
}

function toCompanyName(domain: string): string {
  const root = domain.split(".")[0] ?? domain;
  return root
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function formatCalendarTime(date: Date): string {
  return date.toLocaleString([], {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit"
  });
}
