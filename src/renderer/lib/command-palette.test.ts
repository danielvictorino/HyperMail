import { describe, expect, it } from "vitest";
import {
  createCommandSearchIndex,
  groupRankedCommands,
  rankCommands,
  type CommandSearchEntry
} from "./command-palette";

const commands: CommandSearchEntry[] = [
  {
    id: "reply-current",
    group: "Actions",
    label: "Reply to current thread",
    hint: "R",
    intent: "reply",
    keywords: ["reply", "respond", "current thread", "composer"]
  },
  {
    id: "archive-current",
    group: "Actions",
    label: "Archive current thread",
    hint: "E",
    intent: "archive",
    keywords: ["done", "clear", "archive selected"]
  },
  {
    id: "open-vip",
    group: "Sections",
    label: "Go to VIP",
    intent: "open-section",
    keywords: ["vip", "section", "switch split"]
  },
  {
    id: "archive-maya",
    group: "Threads",
    label: "Archive: Maya launch review",
    subtitle: "Launch review before tomorrow's customer demo",
    intent: "archive",
    threadId: "thread-1",
    keywords: ["maya", "launch", "customer demo"]
  },
  {
    id: "reply-noah",
    group: "Threads",
    label: "Reply to: Noah roadmap checkpoint",
    subtitle: "Roadmap checkpoint for offline architecture",
    intent: "reply",
    threadId: "thread-2",
    keywords: ["noah", "roadmap", "offline architecture"]
  }
];

describe("rankCommands", () => {
  it("prefers intent-matched thread commands for natural language queries", () => {
    const results = rankCommands(commands, "archive maya");

    expect(results[0]?.id).toBe("archive-maya");
  });

  it("surfaces section commands for navigation queries", () => {
    const results = rankCommands(commands, "go vip");

    expect(results[0]?.id).toBe("open-vip");
  });

  it("prefers the current-thread action for pure intent queries", () => {
    const results = rankCommands(commands, "reply");

    expect(results[0]?.id).toBe("reply-current");
  });

  it("groups ranked commands in the expected order", () => {
    const grouped = groupRankedCommands(rankCommands(commands, "reply"));

    expect(grouped[0]?.group).toBe("Actions");
    expect(grouped[1]?.group).toBe("Threads");
  });

  it("returns the same ranked results from a prebuilt command index", () => {
    const index = createCommandSearchIndex(commands);

    expect(rankCommands(index, "archive maya")).toEqual(
      rankCommands(commands, "archive maya")
    );
  });

  it("can keep only the highest ranked commands for large command lists", () => {
    const largeCommandList: CommandSearchEntry[] = [
      ...Array.from({ length: 1_500 }, (_, index) => ({
        id: `bulk-${index}`,
        group: "Threads" as const,
        label: `Open: Sender ${index}`,
        subtitle: `Routine note ${index}`,
        intent: "open-thread" as const,
        threadId: `thread-${index}`,
        keywords: ["bulk", `sender-${index}`]
      })),
      {
        id: "reply-scale-owner",
        group: "Threads",
        label: "Reply to: Scale mailbox owner",
        subtitle: "Large mailbox ranking check",
        intent: "reply",
        threadId: "thread-scale",
        keywords: ["scale", "mailbox", "owner", "reply"]
      }
    ];
    const index = createCommandSearchIndex(largeCommandList);
    const results = rankCommands(index, "reply scale mailbox", { limit: 12 });

    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe("reply-scale-owner");
  });
});
