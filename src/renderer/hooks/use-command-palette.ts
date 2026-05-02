import { startTransition, useDeferredValue, useEffect, useMemo, useRef } from "react";
import type { AuthSessionSummary } from "@shared/contracts";
import type { ThreadProjection } from "@shared/mail/models";
import {
  getDefaultSnoozeTimestamp,
  parseNaturalLanguageSendLater
} from "../lib/send-later";
import {
  createCommandSearchIndex,
  groupRankedCommands,
  rankCommands,
  type CommandSearchEntry,
  type RankedCommand
} from "../lib/command-palette";
import { useCommandPaletteStore } from "../state/command-palette-store";
import type { MailboxSectionId } from "../state/inbox-ui-store";
import type { useMailboxLab } from "./use-mailbox-lab";

interface ExecutableCommand extends CommandSearchEntry {
  execute: () => void | Promise<void>;
}

interface CommandPaletteDependencies {
  authSession: AuthSessionSummary | null;
  connectGmail: () => Promise<unknown>;
  disconnectGmail: () => Promise<unknown>;
  mailbox: ReturnType<typeof useMailboxLab>;
}

interface CommandBuildDependencies {
  authSession: AuthSessionSummary | null;
  manualOffline: boolean;
  selectedThread: ThreadProjection | null;
  threads: ThreadProjection[];
  getLiveContext: () => CommandPaletteDependencies;
}

export function useCommandPalette({
  authSession,
  connectGmail,
  disconnectGmail,
  mailbox
}: CommandPaletteDependencies) {
  const open = useCommandPaletteStore((state) => state.open);
  const query = useCommandPaletteStore((state) => state.query);
  const activeIndex = useCommandPaletteStore((state) => state.activeIndex);
  const openPalette = useCommandPaletteStore((state) => state.openPalette);
  const closePalette = useCommandPaletteStore((state) => state.closePalette);
  const setQuery = useCommandPaletteStore((state) => state.setQuery);
  const setActiveIndex = useCommandPaletteStore((state) => state.setActiveIndex);
  const moveActiveIndex = useCommandPaletteStore((state) => state.moveActiveIndex);
  const deferredQuery = useDeferredValue(query);
  const liveContextRef = useRef<CommandPaletteDependencies>({
    authSession,
    connectGmail,
    disconnectGmail,
    mailbox
  });
  liveContextRef.current = {
    authSession,
    connectGmail,
    disconnectGmail,
    mailbox
  };
  const getLiveContext = useMemo(() => () => liveContextRef.current, []);
  const manualOffline = mailbox.manualOffline;
  const selectedThread = mailbox.selectedThread;
  const threads = mailbox.threads;

  const baseCommands = useMemo(
    () =>
      buildCommands({
        authSession,
        manualOffline,
        selectedThread,
        threads,
        getLiveContext
      }),
    [authSession, getLiveContext, manualOffline, selectedThread, threads]
  );
  const snoozeQueryCommands = useMemo(
    () => buildSnoozeQueryCommands(selectedThread, query, getLiveContext),
    [getLiveContext, query, selectedThread]
  );
  const commands = useMemo(
    () => [...snoozeQueryCommands, ...baseCommands],
    [baseCommands, snoozeQueryCommands]
  );

  const commandSearchIndex = useMemo(
    () => createCommandSearchIndex(commands),
    [commands]
  );

  const rankedCommands = useMemo(() => {
    return rankCommands(commandSearchIndex, deferredQuery, {
      limit: 12
    }) as RankedExecutableCommand[];
  }, [commandSearchIndex, deferredQuery]);

  const groupedCommands = useMemo(
    () => groupRankedCommands(rankedCommands),
    [rankedCommands]
  );

  useEffect(() => {
    if (activeIndex < rankedCommands.length) {
      return;
    }

    setActiveIndex(0);
  }, [activeIndex, rankedCommands.length, setActiveIndex]);

  const activeCommand = rankedCommands[activeIndex] ?? null;

  async function executeCommand(
    command: RankedExecutableCommand | null
  ): Promise<void> {
    if (!command) {
      return;
    }

    closePalette();

    await command.execute();
  }

  return {
    open,
    query,
    activeIndex,
    activeCommand,
    rankedCommands,
    groupedCommands,
    openPalette,
    closePalette,
    setQuery,
    setActiveIndex,
    moveActiveIndex,
    executeCommand
  };
}

type RankedExecutableCommand = RankedCommand & Pick<ExecutableCommand, "execute">;

function buildCommands({
  authSession,
  getLiveContext,
  manualOffline,
  selectedThread,
  threads
}: CommandBuildDependencies): ExecutableCommand[] {
  const commands: ExecutableCommand[] = [];
  const connectedProviderLabel =
    authSession?.provider === "microsoft" ? "Microsoft" : "Gmail";

  const threadCommands = threads.flatMap((thread) =>
    buildThreadCommands(thread, getLiveContext)
  );

  commands.push(...buildSectionCommands(getLiveContext));
  commands.push(
    {
      id: "reply-current",
      group: "Actions",
      label: "Reply to current thread",
      subtitle:
        selectedThread?.thread.subject ?? "Open the composer for the selected thread",
      hint: "R",
      intent: "reply",
      keywords: ["reply", "respond", "current thread", "composer"],
      execute: () => {
        const { mailbox } = getLiveContext();

        if (mailbox.selectedThread) {
          mailbox.openComposer();
        }
      }
    },
    {
      id: "draft-current",
      group: "Actions",
      label: "Draft reply in my voice",
      subtitle:
        selectedThread?.thread.subject ??
        "Generate a concise reply from local voice examples",
      hint: "D",
      intent: "draft",
      keywords: ["draft", "voice", "ai", "reply", "current thread"],
      execute: async () => {
        const { mailbox } = getLiveContext();

        if (mailbox.selectedThread) {
          await mailbox.generateVoiceDraft(mailbox.selectedThread);
        }
      }
    },
    {
      id: "summarize-current",
      group: "Actions",
      label: "Summarize current thread",
      subtitle:
        selectedThread?.thread.subject ??
        "Generate a fast triage summary for the selected thread",
      hint: "A",
      intent: "summarize",
      keywords: ["summarize", "summary", "brief", "triage", "current thread"],
      execute: async () => {
        const { mailbox } = getLiveContext();

        if (mailbox.selectedThread) {
          await mailbox.generateThreadSummary(mailbox.selectedThread);
        }
      }
    },
    {
      id: "classify-current",
      group: "Actions",
      label: "Suggest split for current thread",
      subtitle:
        selectedThread?.thread.subject ??
        "Classify the thread into VIP, Important, or Other",
      hint: "L",
      intent: "classify",
      keywords: ["label", "split", "classify", "vip", "important", "other"],
      execute: async () => {
        const { mailbox } = getLiveContext();

        if (mailbox.selectedThread) {
          await mailbox.suggestThreadSplit(mailbox.selectedThread);
        }
      }
    },
    {
      id: "snooze-current",
      group: "Actions",
      label:
        selectedThread?.thread.snoozedUntil &&
        selectedThread.thread.snoozedUntil > Date.now()
          ? "Unsnooze current thread"
          : "Snooze current thread",
      subtitle:
        selectedThread?.thread.subject ??
        "Pause the selected thread until tomorrow morning",
      hint: "Z",
      intent:
        selectedThread?.thread.snoozedUntil &&
        selectedThread.thread.snoozedUntil > Date.now()
          ? "unsnooze"
          : "snooze",
      keywords: ["snooze", "unsnooze", "later", "pause", "tomorrow 8am"],
      execute: async () => {
        const { mailbox } = getLiveContext();
        const currentThread = mailbox.selectedThread;

        if (!currentThread) {
          return;
        }

        if (
          currentThread.thread.snoozedUntil &&
          currentThread.thread.snoozedUntil > Date.now()
        ) {
          await mailbox.unsnoozeThread(currentThread);
          return;
        }

        await mailbox.snoozeThread(currentThread, getDefaultSnoozeTimestamp());
      }
    },
    ...(selectedThread?.thread.unsubscribe || selectedThread?.thread.unsubscribedAt
      ? [
          {
            id: "unsubscribe-current",
            group: "Actions" as const,
            label: selectedThread?.thread.unsubscribedAt
              ? "Current thread unsubscribed"
              : "Unsubscribe current thread",
            subtitle:
              selectedThread?.thread.subject ??
              "Use the sender's List-Unsubscribe header when available",
            hint: "U",
            intent: "unsubscribe" as const,
            keywords: [
              "unsubscribe",
              "opt out",
              "stop emails",
              "remove",
              "current thread"
            ],
            execute: async () => {
              const { mailbox } = getLiveContext();
              const currentThread = mailbox.selectedThread;

              if (
                currentThread &&
                currentThread.thread.unsubscribe &&
                !currentThread.thread.unsubscribedAt
              ) {
                await mailbox.unsubscribeThread(currentThread);
              }
            }
          }
        ]
      : []),
    {
      id: "follow-up-current",
      group: "Actions",
      label: "Draft follow-up for current thread",
      subtitle:
        selectedThread?.thread.subject ??
        "Generate a concise follow-up for the selected thread",
      hint: "D",
      intent: "follow-up",
      keywords: ["follow up", "waiting", "nudge", "draft", "current thread"],
      execute: async () => {
        const { mailbox } = getLiveContext();

        if (mailbox.selectedThread) {
          await mailbox.generateVoiceDraft(mailbox.selectedThread);
        }
      }
    },
    {
      id: "archive-current",
      group: "Actions",
      label: selectedThread?.thread.archived
        ? "Restore current thread"
        : "Archive current thread",
      subtitle:
        selectedThread?.thread.subject ??
        "Move the selected thread out of the working set",
      hint: "E",
      intent: selectedThread?.thread.archived ? "restore" : "archive",
      keywords: ["archive", "restore", "current thread", "done", "clear"],
      execute: async () => {
        const { mailbox } = getLiveContext();

        if (mailbox.selectedThread) {
          await mailbox.toggleArchive(mailbox.selectedThread);
        }
      }
    },
    {
      id: "handled-current",
      group: "Actions",
      label: "Mark current thread handled",
      subtitle:
        selectedThread?.thread.subject ??
        "Archive the selected thread when it no longer needs attention",
      hint: "E",
      intent: "handled",
      keywords: ["handled", "done", "clear", "archive", "current thread"],
      execute: async () => {
        const { mailbox } = getLiveContext();

        if (mailbox.selectedThread && !mailbox.selectedThread.thread.archived) {
          await mailbox.toggleArchive(mailbox.selectedThread);
        }
      }
    },
    {
      id: "star-current",
      group: "Actions",
      label: selectedThread?.thread.starred
        ? "Unstar current thread"
        : "Star current thread",
      subtitle:
        selectedThread?.thread.subject ?? "Toggle the selected thread pin state",
      hint: "S",
      intent: selectedThread?.thread.starred ? "unstar" : "star",
      keywords: ["star", "favorite", "pin", "current thread"],
      execute: async () => {
        const { mailbox } = getLiveContext();

        if (mailbox.selectedThread) {
          await mailbox.toggleStar(mailbox.selectedThread);
        }
      }
    },
    {
      id: manualOffline ? "system-online" : "system-offline",
      group: "System",
      label: manualOffline ? "Resume online mode" : "Simulate offline mode",
      subtitle: manualOffline
        ? "Reconnect the queue processor"
        : "Pause persistence and keep working locally",
      hint: "⌥O",
      intent: manualOffline ? "online" : "offline",
      keywords: ["offline", "online", "queue", "network", "simulate"],
      execute: () => {
        getLiveContext().mailbox.toggleManualOffline();
      }
    },
    {
      id: "system-refresh-queue",
      group: "System",
      label: "Sync local cache now",
      subtitle: "Retry queued modifiers, outbox sends, and Gmail changes",
      hint: "⌥R",
      intent: "refresh",
      keywords: ["refresh", "retry", "queue", "sync", "kick"],
      execute: async () => {
        await getLiveContext().mailbox.refreshQueue();
      }
    },
    {
      id: authSession ? "gmail-disconnect" : "gmail-connect",
      group: "System",
      label: authSession ? `Disconnect ${connectedProviderLabel}` : "Connect Gmail",
      subtitle: authSession
        ? "Return to the seeded demo mailbox"
        : "Attach Gmail through the secure Electron auth flow",
      intent: authSession ? "online" : "open-thread",
      keywords: ["gmail", "connect", "disconnect", "account"],
      execute: async () => {
        const liveContext = getLiveContext();

        if (liveContext.authSession) {
          await liveContext.disconnectGmail();
        } else {
          await liveContext.connectGmail();
        }
      }
    }
  );

  commands.push(...threadCommands);

  return commands;
}

function buildSectionCommands(
  getLiveContext: () => CommandPaletteDependencies
): ExecutableCommand[] {
  const sections: Array<{ id: MailboxSectionId; label: string; hint: string }> = [
    { id: "inbox", label: "Inbox", hint: "1" },
    { id: "important", label: "Important", hint: "2" },
    { id: "vip", label: "VIP", hint: "3" },
    { id: "waiting", label: "Waiting", hint: "4" },
    { id: "other", label: "Other", hint: "5" },
    { id: "starred", label: "Starred", hint: "6" },
    { id: "snoozed", label: "Snoozed", hint: "7" },
    { id: "archive", label: "Archive", hint: "8" }
  ];

  return sections.map((section) => ({
    id: `section-${section.id}`,
    group: "Sections",
    label: `Go to ${section.label}`,
    subtitle: `Switch the list to the ${section.label} split`,
    hint: section.hint,
    intent: "open-section",
    sectionId: section.id,
    keywords: [section.label.toLowerCase(), "section", "split", "go", "switch"],
    execute: () => {
      startTransition(() => {
        getLiveContext().mailbox.setSelectedSection(section.id);
      });
    }
  }));
}

function buildThreadCommands(
  thread: ThreadProjection,
  getLiveContext: () => CommandPaletteDependencies
): ExecutableCommand[] {
  const labelBase = thread.thread.participantNames.join(", ");
  const keywords = [
    thread.thread.subject,
    thread.thread.snippet,
    ...thread.thread.participantNames,
    ...thread.thread.participantEmails
  ];

  return [
    {
      id: `thread-open-${thread.thread.id}`,
      group: "Threads",
      label: `Open: ${labelBase}`,
      subtitle: thread.thread.subject,
      intent: "open-thread",
      threadId: thread.thread.id,
      keywords: [...keywords, "open", "show", "jump"],
      execute: () => {
        getLiveContext().mailbox.selectThread(thread.thread.id);
      }
    },
    {
      id: `thread-reply-${thread.thread.id}`,
      group: "Threads",
      label: `Reply to: ${labelBase}`,
      subtitle: thread.thread.subject,
      hint: "R",
      intent: "reply",
      threadId: thread.thread.id,
      keywords: [...keywords, "reply", "respond"],
      execute: () => {
        const { mailbox } = getLiveContext();
        mailbox.selectThread(thread.thread.id);
        mailbox.openComposer();
      }
    },
    {
      id: `thread-draft-${thread.thread.id}`,
      group: "Threads",
      label: `Draft in my voice: ${labelBase}`,
      subtitle: thread.thread.subject,
      hint: "D",
      intent: "draft",
      threadId: thread.thread.id,
      keywords: [...keywords, "draft", "voice", "ai", "reply"],
      execute: async () => {
        const { mailbox } = getLiveContext();
        mailbox.selectThread(thread.thread.id);
        await mailbox.generateVoiceDraft(thread);
      }
    },
    {
      id: `thread-follow-up-${thread.thread.id}`,
      group: "Threads",
      label: `Draft follow-up: ${labelBase}`,
      subtitle: thread.thread.subject,
      hint: "D",
      intent: "follow-up",
      threadId: thread.thread.id,
      keywords: [...keywords, "follow up", "waiting", "nudge", "draft"],
      execute: async () => {
        const { mailbox } = getLiveContext();
        mailbox.selectThread(thread.thread.id);
        await mailbox.generateVoiceDraft(thread);
      }
    },
    {
      id: `thread-summary-${thread.thread.id}`,
      group: "Threads",
      label: `Summarize: ${labelBase}`,
      subtitle: thread.thread.subject,
      hint: "A",
      intent: "summarize",
      threadId: thread.thread.id,
      keywords: [...keywords, "summary", "summarize", "brief", "triage"],
      execute: async () => {
        const { mailbox } = getLiveContext();
        mailbox.selectThread(thread.thread.id);
        await mailbox.generateThreadSummary(thread);
      }
    },
    {
      id: `thread-split-${thread.thread.id}`,
      group: "Threads",
      label: `Suggest split: ${labelBase}`,
      subtitle: thread.thread.subject,
      hint: "L",
      intent: "classify",
      threadId: thread.thread.id,
      keywords: [...keywords, "split", "label", "classify", "vip", "important"],
      execute: async () => {
        const { mailbox } = getLiveContext();
        mailbox.selectThread(thread.thread.id);
        await mailbox.suggestThreadSplit(thread);
      }
    },
    {
      id: `thread-snooze-${thread.thread.id}`,
      group: "Threads",
      label: `${thread.thread.snoozedUntil && thread.thread.snoozedUntil > Date.now() ? "Unsnooze" : "Snooze"}: ${labelBase}`,
      subtitle: thread.thread.subject,
      hint: "Z",
      intent:
        thread.thread.snoozedUntil && thread.thread.snoozedUntil > Date.now()
          ? "unsnooze"
          : "snooze",
      threadId: thread.thread.id,
      keywords: [...keywords, "snooze", "later", "pause", "resume"],
      execute: async () => {
        const { mailbox } = getLiveContext();
        mailbox.selectThread(thread.thread.id);

        if (thread.thread.snoozedUntil && thread.thread.snoozedUntil > Date.now()) {
          await mailbox.unsnoozeThread(thread);
          return;
        }

        await mailbox.snoozeThread(thread, getDefaultSnoozeTimestamp());
      }
    },
    ...(thread.thread.unsubscribe || thread.thread.unsubscribedAt
      ? [
          {
            id: `thread-unsubscribe-${thread.thread.id}`,
            group: "Threads" as const,
            label: `${thread.thread.unsubscribedAt ? "Unsubscribed" : "Unsubscribe"}: ${labelBase}`,
            subtitle: thread.thread.subject,
            hint: "U",
            intent: "unsubscribe" as const,
            threadId: thread.thread.id,
            keywords: [...keywords, "unsubscribe", "opt out", "stop emails", "remove"],
            execute: async () => {
              const { mailbox } = getLiveContext();
              mailbox.selectThread(thread.thread.id);

              if (thread.thread.unsubscribe && !thread.thread.unsubscribedAt) {
                await mailbox.unsubscribeThread(thread);
              }
            }
          }
        ]
      : []),
    {
      id: `thread-archive-${thread.thread.id}`,
      group: "Threads",
      label: `${thread.thread.archived ? "Restore" : "Archive"}: ${labelBase}`,
      subtitle: thread.thread.subject,
      hint: "E",
      intent: thread.thread.archived ? "restore" : "archive",
      threadId: thread.thread.id,
      keywords: [...keywords, "archive", "restore", "done", "clear"],
      execute: async () => {
        const { mailbox } = getLiveContext();
        mailbox.selectThread(thread.thread.id);
        await mailbox.toggleArchive(thread);
      }
    },
    {
      id: `thread-star-${thread.thread.id}`,
      group: "Threads",
      label: `${thread.thread.starred ? "Unstar" : "Star"}: ${labelBase}`,
      subtitle: thread.thread.subject,
      hint: "S",
      intent: thread.thread.starred ? "unstar" : "star",
      threadId: thread.thread.id,
      keywords: [...keywords, "star", "favorite", "pin"],
      execute: async () => {
        const { mailbox } = getLiveContext();
        mailbox.selectThread(thread.thread.id);
        await mailbox.toggleStar(thread);
      }
    }
  ];
}

function buildSnoozeQueryCommands(
  selectedThread: ThreadProjection | null,
  query: string,
  getLiveContext: () => CommandPaletteDependencies
): ExecutableCommand[] {
  if (!selectedThread) {
    return [];
  }

  const normalized = query.trim().toLowerCase().replace(/\s+/g, " ");
  const match = normalized.match(/^(?:snooze|later|pause)\s+(.+)$/);
  const schedule = match?.[1] ? parseNaturalLanguageSendLater(match[1]) : null;

  if (!schedule) {
    return [];
  }

  return [
    {
      id: `query-snooze-${selectedThread.thread.id}`,
      group: "Actions",
      label: `Snooze current thread until ${schedule.label}`,
      subtitle: selectedThread.thread.subject,
      hint: "Z",
      intent: "snooze",
      keywords: ["snooze", "later", schedule.label, selectedThread.thread.subject],
      execute: async () => {
        const { mailbox } = getLiveContext();
        await mailbox.snoozeThread(selectedThread, schedule.sendAt);
      }
    },
    {
      id: `query-unsnooze-${selectedThread.thread.id}`,
      group: "Actions",
      label: `Unsnooze current thread`,
      subtitle: `Clear snooze and return ${selectedThread.thread.subject} to the working set`,
      hint: "Z",
      intent: "unsnooze",
      keywords: ["unsnooze", "resume", selectedThread.thread.subject],
      execute: async () => {
        const { mailbox } = getLiveContext();
        await mailbox.unsnoozeThread(selectedThread);
      }
    }
  ];
}
