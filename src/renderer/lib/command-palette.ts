import type { MailboxSectionId } from "@/state/inbox-ui-store";

export type CommandGroup = "Actions" | "Threads" | "Sections" | "System";
export type CommandIntent =
  | "reply"
  | "draft"
  | "summarize"
  | "classify"
  | "snooze"
  | "unsnooze"
  | "unsubscribe"
  | "follow-up"
  | "handled"
  | "archive"
  | "restore"
  | "star"
  | "unstar"
  | "open-thread"
  | "open-section"
  | "offline"
  | "online"
  | "refresh";

export interface CommandSearchEntry {
  id: string;
  group: CommandGroup;
  label: string;
  subtitle?: string;
  hint?: string;
  intent: CommandIntent;
  keywords: string[];
  sectionId?: MailboxSectionId;
  threadId?: string;
}

export type RankedCommand<TCommand extends CommandSearchEntry = CommandSearchEntry> =
  TCommand & {
    score: number;
  };

interface IndexedCommandSearchEntry<
  TCommand extends CommandSearchEntry = CommandSearchEntry
> {
  command: TCommand;
  normalizedLabel: string;
  haystack: string;
  order: number;
}

export interface CommandSearchIndex<
  TCommand extends CommandSearchEntry = CommandSearchEntry
> {
  commands: TCommand[];
  entries: Array<IndexedCommandSearchEntry<TCommand>>;
}

export interface RankCommandOptions {
  limit?: number;
}

interface ParsedIntent {
  intent: CommandIntent | null;
  remainder: string;
}

const whitespacePattern = /\s+/g;

const intentAliases: Record<CommandIntent, string[]> = {
  reply: ["reply", "respond", "answer"],
  draft: ["draft", "write", "compose"],
  summarize: ["summarize", "summary", "brief"],
  classify: ["label", "classify", "split"],
  snooze: ["snooze", "later", "pause"],
  unsnooze: ["unsnooze", "resume"],
  unsubscribe: ["unsubscribe", "opt out", "stop emails", "remove"],
  "follow-up": ["follow up", "follow-up", "waiting", "nudge"],
  handled: ["handled", "done", "clear"],
  archive: ["archive", "done", "clear"],
  restore: ["restore", "unarchive"],
  star: ["star", "favorite", "pin"],
  unstar: ["unstar", "remove star"],
  "open-thread": ["open", "show", "jump"],
  "open-section": ["go", "open", "switch", "view"],
  offline: ["offline", "airplane", "disconnect"],
  online: ["online", "reconnect", "resume"],
  refresh: ["refresh", "kick", "retry", "sync"]
};

function normalize(input: string): string {
  return input.trim().toLowerCase().replace(whitespacePattern, " ");
}

function tokenize(input: string): string[] {
  return normalize(input)
    .split(" ")
    .map((token) => token.trim())
    .filter(Boolean);
}

function parseIntent(query: string): ParsedIntent {
  const normalizedQuery = normalize(query);

  if (!normalizedQuery) {
    return {
      intent: null,
      remainder: ""
    };
  }

  for (const [intent, aliases] of Object.entries(intentAliases) as Array<
    [CommandIntent, string[]]
  >) {
    for (const alias of aliases) {
      if (normalizedQuery === alias) {
        return {
          intent,
          remainder: ""
        };
      }

      if (normalizedQuery.startsWith(`${alias} `)) {
        return {
          intent,
          remainder: normalizedQuery.slice(alias.length + 1).trim()
        };
      }
    }
  }

  return {
    intent: null,
    remainder: normalizedQuery
  };
}

export function createCommandSearchIndex<TCommand extends CommandSearchEntry>(
  commands: TCommand[]
): CommandSearchIndex<TCommand> {
  return {
    commands,
    entries: commands.map((command, order) => ({
      command,
      normalizedLabel: normalize(command.label),
      haystack: normalize(
        [command.label, command.subtitle ?? "", ...command.keywords].join(" ")
      ),
      order
    }))
  };
}

function compareRankedCommands(left: RankedCommand, right: RankedCommand): number {
  return right.score - left.score;
}

function insertRankedCommand<TCommand extends CommandSearchEntry>(
  rankedCommands: Array<RankedCommand<TCommand>>,
  command: RankedCommand<TCommand>,
  limit: number | undefined
): void {
  if (!limit) {
    rankedCommands.push(command);
    return;
  }

  let insertIndex = 0;

  while (insertIndex < rankedCommands.length) {
    const existingCommand = rankedCommands[insertIndex];

    if (!existingCommand || existingCommand.score < command.score) {
      break;
    }

    insertIndex += 1;
  }

  if (insertIndex >= limit) {
    return;
  }

  rankedCommands.splice(insertIndex, 0, command);

  if (rankedCommands.length > limit) {
    rankedCommands.pop();
  }
}

export function rankCommands<TCommand extends CommandSearchEntry>(
  source: TCommand[] | CommandSearchIndex<TCommand>,
  query: string,
  options: RankCommandOptions = {}
): Array<RankedCommand<TCommand>> {
  const index = Array.isArray(source) ? createCommandSearchIndex(source) : source;
  const normalizedQuery = normalize(query);
  const rankedCommands: Array<RankedCommand<TCommand>> = [];

  if (!normalizedQuery) {
    for (const entry of index.entries) {
      insertRankedCommand(
        rankedCommands,
        {
          ...entry.command,
          score: 10_000 - entry.order
        },
        options.limit
      );
    }

    return options.limit ? rankedCommands : rankedCommands.sort(compareRankedCommands);
  }

  const parsedIntent = parseIntent(normalizedQuery);
  const queryTokens = tokenize(parsedIntent.remainder || normalizedQuery);

  for (const entry of index.entries) {
    const command = entry.command;
    let score = 0;

    if (parsedIntent.intent && command.intent === parsedIntent.intent) {
      score += 200;
    }

    if (entry.normalizedLabel.startsWith(normalizedQuery)) {
      score += 160;
    }

    if (entry.normalizedLabel.includes(normalizedQuery)) {
      score += 90;
    }

    for (const token of queryTokens) {
      if (entry.haystack.includes(token)) {
        score += 40;
      } else {
        score -= 25;
      }
    }

    if (
      parsedIntent.intent &&
      parsedIntent.remainder &&
      entry.haystack.includes(parsedIntent.remainder)
    ) {
      score += 120;
    }

    if (command.group === "Actions") {
      score += 14;
    }

    if (command.group === "Threads") {
      score += 6;
    }

    const rankedCommand = {
      ...command,
      score: score - entry.order * 0.01
    };

    if (rankedCommand.score <= 0) {
      continue;
    }

    insertRankedCommand(rankedCommands, rankedCommand, options.limit);
  }

  return options.limit ? rankedCommands : rankedCommands.sort(compareRankedCommands);
}

export function groupRankedCommands<TCommand extends CommandSearchEntry>(
  commands: Array<RankedCommand<TCommand>>
): Array<{ group: CommandGroup; items: Array<RankedCommand<TCommand>> }> {
  const grouped = new Map<CommandGroup, Array<RankedCommand<TCommand>>>();
  const groupOrder: CommandGroup[] = ["Actions", "Threads", "Sections", "System"];

  for (const command of commands) {
    const existing = grouped.get(command.group) ?? [];
    existing.push(command);
    grouped.set(command.group, existing);
  }

  return groupOrder
    .map((group) => ({
      group,
      items: grouped.get(group) ?? []
    }))
    .filter((entry) => entry.items.length > 0);
}
