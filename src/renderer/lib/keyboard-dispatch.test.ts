// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import type { ThreadProjection } from "@shared/mail/models";
import {
  dispatchKeyboardEvent,
  type KeyboardDispatchOptions
} from "./keyboard-dispatch";

function fakeEvent(init: {
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
  target?: EventTarget | null;
}): KeyboardEvent {
  const handlers = { preventDefault: vi.fn() };
  return {
    key: init.key,
    metaKey: !!init.metaKey,
    ctrlKey: !!init.ctrlKey,
    altKey: !!init.altKey,
    target: init.target ?? null,
    preventDefault: handlers.preventDefault
  } as unknown as KeyboardEvent;
}

function fakeThread(
  overrides: Partial<ThreadProjection["thread"]> = {}
): ThreadProjection {
  return {
    thread: {
      id: "t1",
      accountId: "a",
      subject: "s",
      snippet: "",
      participantNames: [],
      participantEmails: [],
      split: "important",
      unread: false,
      starred: false,
      archived: false,
      snoozedUntil: null,
      unsubscribe: null,
      unsubscribedAt: null,
      lastMessageAt: 0,
      messageIds: [],
      updatedAt: 0,
      ...overrides
    },
    messages: [],
    queueDepth: 0,
    pendingModifierIds: [],
    pendingModifierTypes: []
  };
}

function makeOptions(
  overrides: Partial<KeyboardDispatchOptions> = {}
): KeyboardDispatchOptions {
  return {
    commandPaletteOpen: false,
    openCommandPalette: vi.fn(),
    closeCommandPalette: vi.fn(),
    commandPaletteMove: vi.fn(),
    commandPaletteCount: 0,
    executeActiveCommand: vi.fn(async () => {}),
    selectedThread: null,
    selectedSection: "inbox",
    selectNextThread: vi.fn(),
    selectPreviousThread: vi.fn(),
    setSelectedSection: vi.fn(),
    searchQuery: "",
    clearSearchQuery: vi.fn(),
    requestSearchFocus: vi.fn(),
    openComposer: vi.fn(),
    closeComposer: vi.fn(),
    composerOpen: false,
    toggleStar: vi.fn(async () => {}),
    toggleArchive: vi.fn(async () => {}),
    snoozeThread: vi.fn(async () => {}),
    unsnoozeThread: vi.fn(async () => {}),
    unsubscribeThread: vi.fn(async () => {}),
    summarizeThread: vi.fn(async () => {}),
    generateVoiceDraft: vi.fn(async () => {}),
    suggestThreadSplit: vi.fn(async () => {}),
    ...overrides
  };
}

describe("dispatchKeyboardEvent", () => {
  it("Ctrl+K opens the command palette", async () => {
    const options = makeOptions();
    await dispatchKeyboardEvent(fakeEvent({ key: "k", ctrlKey: true }), options);
    expect(options.openCommandPalette).toHaveBeenCalledOnce();
  });

  it("Escape closes the palette when open (precedence over composer)", async () => {
    const options = makeOptions({
      commandPaletteOpen: true,
      composerOpen: true
    });
    await dispatchKeyboardEvent(fakeEvent({ key: "Escape" }), options);
    expect(options.closeCommandPalette).toHaveBeenCalledOnce();
    expect(options.closeComposer).not.toHaveBeenCalled();
  });

  it("ArrowDown in palette moves the selection", async () => {
    const options = makeOptions({
      commandPaletteOpen: true,
      commandPaletteCount: 5
    });
    await dispatchKeyboardEvent(fakeEvent({ key: "ArrowDown" }), options);
    expect(options.commandPaletteMove).toHaveBeenCalledWith(1, 5);
  });

  it("ArrowUp in palette moves the selection backward", async () => {
    const options = makeOptions({
      commandPaletteOpen: true,
      commandPaletteCount: 5
    });
    await dispatchKeyboardEvent(fakeEvent({ key: "ArrowUp" }), options);
    expect(options.commandPaletteMove).toHaveBeenCalledWith(-1, 5);
  });

  it("Enter in palette executes the active command", async () => {
    const options = makeOptions({
      commandPaletteOpen: true,
      commandPaletteCount: 5
    });
    await dispatchKeyboardEvent(fakeEvent({ key: "Enter" }), options);
    expect(options.executeActiveCommand).toHaveBeenCalledOnce();
  });

  it("j selects next thread when not editable", async () => {
    const options = makeOptions();
    await dispatchKeyboardEvent(fakeEvent({ key: "j" }), options);
    expect(options.selectNextThread).toHaveBeenCalledOnce();
  });

  it("ignores j inside an input", async () => {
    const input = document.createElement("input");
    const options = makeOptions();
    await dispatchKeyboardEvent(fakeEvent({ key: "j", target: input }), options);
    expect(options.selectNextThread).not.toHaveBeenCalled();
  });

  it("ignores alt-modified keys for shortcuts", async () => {
    const options = makeOptions();
    await dispatchKeyboardEvent(fakeEvent({ key: "j", altKey: true }), options);
    expect(options.selectNextThread).not.toHaveBeenCalled();
  });

  it("number keys switch section", async () => {
    const options = makeOptions();
    await dispatchKeyboardEvent(fakeEvent({ key: "3" }), options);
    expect(options.setSelectedSection).toHaveBeenCalledWith("vip");
  });

  it("s toggles star when a thread is selected", async () => {
    const thread = fakeThread();
    const options = makeOptions({ selectedThread: thread });
    await dispatchKeyboardEvent(fakeEvent({ key: "s" }), options);
    expect(options.toggleStar).toHaveBeenCalledWith(thread);
  });

  it("z unsnoozes when thread is currently snoozed in the future", async () => {
    const thread = fakeThread({ snoozedUntil: Date.now() + 60_000 });
    const options = makeOptions({ selectedThread: thread });
    await dispatchKeyboardEvent(fakeEvent({ key: "z" }), options);
    expect(options.unsnoozeThread).toHaveBeenCalledWith(thread);
    expect(options.snoozeThread).not.toHaveBeenCalled();
  });

  it("z snoozes otherwise", async () => {
    const thread = fakeThread({ snoozedUntil: null });
    const options = makeOptions({ selectedThread: thread });
    await dispatchKeyboardEvent(fakeEvent({ key: "z" }), options);
    expect(options.snoozeThread).toHaveBeenCalledWith(thread);
    expect(options.unsnoozeThread).not.toHaveBeenCalled();
  });

  it("u only unsubscribes when an unsubscribe target exists and not already unsubscribed", async () => {
    const noTarget = fakeThread();
    const opts1 = makeOptions({ selectedThread: noTarget });
    await dispatchKeyboardEvent(fakeEvent({ key: "u" }), opts1);
    expect(opts1.unsubscribeThread).not.toHaveBeenCalled();

    const already = fakeThread({
      unsubscribe: {
        method: "http-get",
        endpoint: "https://ex.com/u",
        oneClick: true,
        sourceMessageId: "m"
      },
      unsubscribedAt: 123
    });
    const opts2 = makeOptions({ selectedThread: already });
    await dispatchKeyboardEvent(fakeEvent({ key: "u" }), opts2);
    expect(opts2.unsubscribeThread).not.toHaveBeenCalled();

    const ready = fakeThread({
      unsubscribe: {
        method: "http-get",
        endpoint: "https://ex.com/u",
        oneClick: true,
        sourceMessageId: "m"
      }
    });
    const opts3 = makeOptions({ selectedThread: ready });
    await dispatchKeyboardEvent(fakeEvent({ key: "u" }), opts3);
    expect(opts3.unsubscribeThread).toHaveBeenCalledWith(ready);
  });

  it("/ requests search focus", async () => {
    const options = makeOptions();
    await dispatchKeyboardEvent(fakeEvent({ key: "/" }), options);
    expect(options.requestSearchFocus).toHaveBeenCalledOnce();
  });

  it("Escape clears search query when palette closed and composer closed", async () => {
    const options = makeOptions({ searchQuery: "hello" });
    await dispatchKeyboardEvent(fakeEvent({ key: "Escape" }), options);
    expect(options.clearSearchQuery).toHaveBeenCalledOnce();
  });
});
