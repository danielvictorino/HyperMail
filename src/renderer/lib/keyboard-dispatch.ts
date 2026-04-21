import type { ThreadProjection } from "@shared/mail/models";
import type { MailboxSectionId } from "../state/inbox-ui-store";

export interface KeyboardDispatchOptions {
  commandPaletteOpen: boolean;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  commandPaletteMove: (delta: number, total: number) => void;
  commandPaletteCount: number;
  executeActiveCommand: () => Promise<void>;
  selectedThread: ThreadProjection | null;
  selectedSection: MailboxSectionId;
  selectNextThread: () => void;
  selectPreviousThread: () => void;
  setSelectedSection: (section: MailboxSectionId) => void;
  searchQuery: string;
  clearSearchQuery: () => void;
  requestSearchFocus: () => void;
  openComposer: () => void;
  closeComposer: () => void;
  composerOpen: boolean;
  toggleStar: (thread: ThreadProjection) => Promise<void>;
  toggleArchive: (thread: ThreadProjection) => Promise<void>;
  snoozeThread: (thread: ThreadProjection) => Promise<void>;
  unsnoozeThread: (thread: ThreadProjection) => Promise<void>;
  unsubscribeThread: (thread: ThreadProjection) => Promise<void>;
  summarizeThread: (thread?: ThreadProjection | null) => Promise<void>;
  generateVoiceDraft: (thread?: ThreadProjection | null) => Promise<void>;
  suggestThreadSplit: (thread?: ThreadProjection | null) => Promise<void>;
}

export const SECTION_BY_NUMBER: Record<string, MailboxSectionId> = {
  "1": "inbox",
  "2": "important",
  "3": "vip",
  "4": "other",
  "5": "starred",
  "6": "snoozed",
  "7": "archive"
};

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.getAttribute("role") === "textbox"
  );
}

export async function dispatchKeyboardEvent(
  event: KeyboardEvent,
  options: KeyboardDispatchOptions
): Promise<void> {
  const metaOrCtrl = event.metaKey || event.ctrlKey;

  if (metaOrCtrl && event.key.toLowerCase() === "k") {
    event.preventDefault();
    options.openCommandPalette();
    return;
  }

  if (options.commandPaletteOpen) {
    if (event.key === "Escape") {
      event.preventDefault();
      options.closeCommandPalette();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      options.commandPaletteMove(1, options.commandPaletteCount);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      options.commandPaletteMove(-1, options.commandPaletteCount);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      await options.executeActiveCommand();
    }

    return;
  }

  if (event.key === "Escape" && options.composerOpen) {
    event.preventDefault();
    options.closeComposer();
    return;
  }

  if (event.key === "Escape" && options.searchQuery) {
    event.preventDefault();
    options.clearSearchQuery();
    return;
  }

  if (isEditableTarget(event.target)) {
    return;
  }

  if (event.altKey || metaOrCtrl) {
    return;
  }

  const lowerKey = event.key.toLowerCase();

  if (event.key === "/") {
    event.preventDefault();
    options.requestSearchFocus();
    return;
  }

  if (lowerKey in SECTION_BY_NUMBER) {
    event.preventDefault();
    options.setSelectedSection(SECTION_BY_NUMBER[lowerKey] ?? "inbox");
    return;
  }

  if (lowerKey === "j" || event.key === "ArrowDown") {
    event.preventDefault();
    options.selectNextThread();
    return;
  }

  if (lowerKey === "k" || event.key === "ArrowUp") {
    event.preventDefault();
    options.selectPreviousThread();
    return;
  }

  if (lowerKey === "r") {
    event.preventDefault();
    options.openComposer();
    return;
  }

  if (lowerKey === "a" && options.selectedThread) {
    event.preventDefault();
    await options.summarizeThread(options.selectedThread);
    return;
  }

  if (lowerKey === "d" && options.selectedThread) {
    event.preventDefault();
    await options.generateVoiceDraft(options.selectedThread);
    return;
  }

  if (lowerKey === "l" && options.selectedThread) {
    event.preventDefault();
    await options.suggestThreadSplit(options.selectedThread);
    return;
  }

  if (lowerKey === "s" && options.selectedThread) {
    event.preventDefault();
    await options.toggleStar(options.selectedThread);
    return;
  }

  if (lowerKey === "e" && options.selectedThread) {
    event.preventDefault();
    await options.toggleArchive(options.selectedThread);
    return;
  }

  if (lowerKey === "z" && options.selectedThread) {
    event.preventDefault();

    if (
      options.selectedThread.thread.snoozedUntil &&
      options.selectedThread.thread.snoozedUntil > Date.now()
    ) {
      await options.unsnoozeThread(options.selectedThread);
      return;
    }

    await options.snoozeThread(options.selectedThread);
  }

  if (lowerKey === "u" && options.selectedThread) {
    event.preventDefault();

    if (
      options.selectedThread.thread.unsubscribe &&
      !options.selectedThread.thread.unsubscribedAt
    ) {
      await options.unsubscribeThread(options.selectedThread);
    }
  }
}
