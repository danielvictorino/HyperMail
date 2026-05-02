// @vitest-environment jsdom
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clickElement, findButton, flushReact, renderReact } from "@/test/render";
import { createThreadProjection } from "@/test/mail-fixtures";
import { ThreadComposer } from "./thread-composer";

const editorMock = vi.hoisted(() => {
  const state = {
    html: "<p>Initial reply</p>",
    listeners: new Map<string, Set<() => void>>()
  };

  return {
    state,
    editor: {
      commands: {
        setContent: (html: string) => {
          state.html = html;
        }
      },
      getHTML: () => state.html,
      on: (event: string, listener: () => void) => {
        const listeners = state.listeners.get(event) ?? new Set<() => void>();
        listeners.add(listener);
        state.listeners.set(event, listeners);
      },
      off: (event: string, listener: () => void) => {
        state.listeners.get(event)?.delete(listener);
      }
    }
  };
});

vi.mock("@tiptap/extension-placeholder", () => ({
  default: {
    configure: () => ({ name: "placeholder" })
  }
}));

vi.mock("@tiptap/starter-kit", () => ({
  default: {
    configure: () => ({ name: "starter-kit" })
  }
}));

vi.mock("@tiptap/react", () => ({
  EditorContent: ({ editor }: { editor: { getHTML: () => string } | null }) => (
    <div role="textbox">{editor?.getHTML()}</div>
  ),
  useEditor: () => editorMock.editor
}));

let view: ReturnType<typeof renderReact> | null = null;

beforeEach(() => {
  editorMock.state.html = "<p>Initial reply</p>";
  editorMock.state.listeners.clear();
});

afterEach(() => {
  view?.unmount();
  view = null;
  vi.useRealTimers();
});

function emitEditorUpdate(): void {
  const listeners = editorMock.state.listeners.get("update") ?? new Set<() => void>();

  for (const listener of listeners) {
    listener();
  }
}

describe("ThreadComposer", () => {
  it("restores local drafts, saves edits, and queues the current body", async () => {
    vi.useFakeTimers();

    const thread = createThreadProjection();
    const loadDraft = vi.fn(async () => "<p>Stored reply</p>");
    const saveDraft = vi.fn(async () => {});
    const onQueueReply = vi.fn(async () => {});
    const onClose = vi.fn();

    view = renderReact(
      <ThreadComposer
        thread={thread}
        open
        onClose={onClose}
        loadDraft={loadDraft}
        saveDraft={saveDraft}
        onQueueReply={onQueueReply}
        onQueueReplyAt={vi.fn(async () => {})}
        onQueueReplyLater={vi.fn(async () => {})}
        onGenerateDraft={vi.fn(async () => {})}
        isGeneratingDraft={false}
        assistantEnabled
        draftSeed={null}
        onConsumeDraftSeed={vi.fn()}
      />
    );

    await flushReact();

    expect(loadDraft).toHaveBeenCalledWith(thread);
    expect(view.container.textContent).toContain("Draft restored locally");
    expect(editorMock.state.html).toBe("<p>Stored reply</p>");

    editorMock.state.html = "<p>Changed reply</p>";
    await act(async () => {
      emitEditorUpdate();
      vi.advanceTimersByTime(300);
    });
    await flushReact();

    expect(saveDraft).toHaveBeenCalledWith(thread, "<p>Changed reply</p>");

    await clickElement(findButton(view.container, "Queue send"));

    expect(onQueueReply).toHaveBeenCalledWith(thread, "<p>Changed reply</p>");
    expect(onClose).toHaveBeenCalledOnce();
  });
});
