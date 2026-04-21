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

export interface RankedCommand extends CommandSearchEntry {
  score: number;
}

interface ParsedIntent {
  intent: CommandIntent | null;
  remainder: string;
}

const intentAliases: Record<CommandIntent, string[]> = {
  reply: ["reply", "respond", "answer"],
  draft: ["draft", "write", "compose"],
  summarize: ["summarize", "summary", "brief"],
  classify: ["label", "classify", "split"],
  snooze: ["snooze", "later", "pause"],
  unsnooze: ["unsnooze", "resume"],
  unsubscribe: ["unsubscribe", "opt out", "stop emails", "remove"],
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
  return input.trim().toLowerCase().replace(/\s+/g, " ");
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

export function rankCommands(
  commands: CommandSearchEntry[],
  query: string
): RankedCommand[] {
  const normalizedQuery = normalize(query);

  if (!normalizedQuery) {
    return commands
      .map((command, index) => ({
        ...command,
        score: 10_000 - index
      }))
      .sort((left, right) => right.score - left.score);
  }

  const parsedIntent = parseIntent(normalizedQuery);
  const queryTokens = tokenize(parsedIntent.remainder || normalizedQuery);

  return commands
    .map((command, index) => {
      const haystack = [
        command.label,
        command.subtitle ?? "",
        ...command.keywords
      ]
        .join(" ")
        .toLowerCase();

      let score = 0;

      if (parsedIntent.intent && command.intent === parsedIntent.intent) {
        score += 200;
      }

      if (command.label.toLowerCase().startsWith(normalizedQuery)) {
        score += 160;
      }

      if (command.label.toLowerCase().includes(normalizedQuery)) {
        score += 90;
      }

      for (const token of queryTokens) {
        if (haystack.includes(token)) {
          score += 40;
        } else {
          score -= 25;
        }
      }

      if (
        parsedIntent.intent &&
        parsedIntent.remainder &&
        haystack.includes(parsedIntent.remainder)
      ) {
        score += 120;
      }

      if (command.group === "Actions") {
        score += 14;
      }

      if (command.group === "Threads") {
        score += 6;
      }

      return {
        ...command,
        score: score - index * 0.01
      };
    })
    .filter((command) => command.score > 0)
    .sort((left, right) => right.score - left.score);
}

export function groupRankedCommands(
  commands: RankedCommand[]
): Array<{ group: CommandGroup; items: RankedCommand[] }> {
  const grouped = new Map<CommandGroup, RankedCommand[]>();
  const groupOrder: CommandGroup[] = [
    "Actions",
    "Threads",
    "Sections",
    "System"
  ];

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
