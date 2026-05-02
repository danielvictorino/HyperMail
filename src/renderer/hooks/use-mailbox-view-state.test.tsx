// @vitest-environment jsdom
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { InboxSnapshot } from "@shared/mail/models";
import {
  createAttachmentCacheSummary,
  createDraftSummary,
  createPerformanceSummary,
  createThreadProjection
} from "@/test/mail-fixtures";
import { flushReact, renderReact } from "@/test/render";
import { useInboxUiStore } from "../state/inbox-ui-store";
import { type MailboxViewState, useMailboxViewState } from "./use-mailbox-view-state";

let view: ReturnType<typeof renderReact> | null = null;
let latestState: MailboxViewState | null = null;

beforeEach(() => {
  useInboxUiStore.setState({
    selectedThreadId: null,
    selectedSection: "inbox",
    composerOpen: false,
    searchQuery: "",
    searchFocusNonce: 0
  });
  latestState = null;
});

afterEach(() => {
  view?.unmount();
  view = null;
});

describe("useMailboxViewState", () => {
  it("derives visible threads and keyboard selection from the local snapshot", async () => {
    const snapshot = createSnapshot([
      createThreadProjection({
        id: "thread-1",
        subject: "Launch review",
        lastMessageAt: 20
      }),
      createThreadProjection({
        id: "thread-2",
        subject: "Roadmap checkpoint",
        lastMessageAt: 10,
        unread: false
      })
    ]);

    view = renderReact(<MailboxViewHarness snapshot={snapshot} />);
    await flushReact();

    expect(requireLatestState().sectionLabel).toBe("All inbox");
    expect(requireLatestState().visibleThreads).toHaveLength(2);
    expect(requireLatestState().selectedThread?.thread.id).toBe("thread-1");

    await act(async () => {
      requireLatestState().selectNextThread();
    });
    await flushReact();

    expect(requireLatestState().selectedThread?.thread.id).toBe("thread-2");

    await act(async () => {
      requireLatestState().selectPreviousThread();
    });
    await flushReact();

    expect(requireLatestState().selectedThread?.thread.id).toBe("thread-1");
  });

  it("routes search state through the focused view hook", async () => {
    const snapshot = createSnapshot([
      createThreadProjection({
        id: "thread-1",
        subject: "Launch review",
        snippet: "Customer demo tomorrow"
      }),
      createThreadProjection({
        id: "thread-2",
        subject: "Roadmap checkpoint",
        snippet: "Offline architecture"
      })
    ]);

    view = renderReact(<MailboxViewHarness snapshot={snapshot} />);
    await flushReact();

    await act(async () => {
      requireLatestState().setSearchQuery("roadmap");
    });
    await flushReact();
    await flushReact();

    expect(requireLatestState().isSearching).toBe(true);
    expect(requireLatestState().sectionLabel).toBe("Search");
    expect(
      requireLatestState().visibleThreads.map((thread) => thread.thread.id)
    ).toEqual(["thread-2"]);
  });
});

function MailboxViewHarness({ snapshot }: { snapshot: InboxSnapshot }) {
  latestState = useMailboxViewState({ snapshot });
  return null;
}

function requireLatestState(): MailboxViewState {
  if (!latestState) {
    throw new Error("Mailbox view state was not rendered.");
  }

  return latestState;
}

function createSnapshot(threads: InboxSnapshot["threads"]): InboxSnapshot {
  return {
    account: null,
    threads,
    labels: [],
    drafts: [],
    draftSummary: createDraftSummary(),
    queue: [],
    queueSummary: {
      pending: 0,
      processing: 0,
      retry: 0,
      total: 0
    },
    attachmentCacheSummary: createAttachmentCacheSummary(),
    performance: createPerformanceSummary()
  };
}
