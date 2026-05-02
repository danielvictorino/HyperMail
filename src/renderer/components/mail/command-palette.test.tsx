// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RankedCommand } from "@/lib/command-palette";
import { clickElement, findButton, renderReact, setInputValue } from "@/test/render";
import { CommandPalette } from "./command-palette";

let view: ReturnType<typeof renderReact> | null = null;

afterEach(() => {
  view?.unmount();
  view = null;
});

function command(overrides: Partial<RankedCommand>): RankedCommand {
  return {
    id: "reply-current",
    group: "Actions",
    label: "Reply to Maya",
    subtitle: "Investor update",
    hint: "R",
    intent: "reply",
    keywords: ["reply", "maya"],
    score: 100,
    ...overrides
  };
}

describe("CommandPalette", () => {
  it("focuses search, updates the query, and executes a selected command", async () => {
    const onQueryChange = vi.fn();
    const onExecuteIndex = vi.fn(async () => {});
    const onClose = vi.fn();

    view = renderReact(
      <CommandPalette
        open
        query=""
        activeIndex={0}
        groupedCommands={[
          {
            group: "Actions",
            items: [command({ id: "reply-current" })]
          }
        ]}
        onClose={onClose}
        onQueryChange={onQueryChange}
        onHoverIndex={vi.fn()}
        onExecuteIndex={onExecuteIndex}
      />
    );

    const input = view.container.querySelector("input");
    expect(input).toBeInstanceOf(HTMLInputElement);
    expect(document.activeElement).toBe(input);

    await setInputValue(input as HTMLInputElement, "reply maya");
    expect(onQueryChange).toHaveBeenCalledWith("reply maya");

    await clickElement(findButton(view.container, "Reply to Maya"));
    expect(onExecuteIndex).toHaveBeenCalledWith(0);

    const closeButton = view.container.querySelector(
      'button[aria-label="Close command palette"]'
    );
    expect(closeButton).toBeInstanceOf(HTMLButtonElement);

    await clickElement(closeButton as HTMLButtonElement);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("renders the empty result state when no commands match", () => {
    view = renderReact(
      <CommandPalette
        open
        query="unknown"
        activeIndex={0}
        groupedCommands={[]}
        onClose={vi.fn()}
        onQueryChange={vi.fn()}
        onHoverIndex={vi.fn()}
        onExecuteIndex={vi.fn(async () => {})}
      />
    );

    expect(view.container.textContent).toContain("No matches");
  });
});
