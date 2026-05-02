import { startTransition, useDeferredValue, useEffect, useMemo } from "react";
import type { InboxSnapshot, ThreadProjection } from "@shared/mail/models";
import {
  buildCalendarContext,
  buildDailyBrief,
  buildSenderInsight,
  filterThreadsBySection,
  getMailboxNavItems,
  getSectionDescription,
  getSectionHeadline,
  type DailyBrief
} from "../lib/mailbox-view";
import { searchThreads } from "../lib/mailbox-search";
import { type MailboxSectionId, useInboxUiStore } from "../state/inbox-ui-store";

export interface MailboxViewState {
  threads: ThreadProjection[];
  activeThreads: ThreadProjection[];
  selectedThread: ThreadProjection | null;
  selectedThreadQueue: InboxSnapshot["queue"];
  sectionLabel: string;
  sectionDescription: string;
  navItems: ReturnType<typeof getMailboxNavItems>;
  selectedSection: MailboxSectionId;
  searchQuery: string;
  isSearching: boolean;
  searchFocusNonce: number;
  visibleThreads: ThreadProjection[];
  setSelectedSection: (section: MailboxSectionId) => void;
  setSearchQuery: (searchQuery: string) => void;
  clearSearchQuery: () => void;
  requestSearchFocus: () => void;
  senderInsight: ReturnType<typeof buildSenderInsight>;
  calendarContext: ReturnType<typeof buildCalendarContext>;
  dailyBrief: DailyBrief;
  selectThread: (threadId: string) => void;
  selectNextThread: () => void;
  selectPreviousThread: () => void;
}

interface UseMailboxViewStateOptions {
  snapshot: InboxSnapshot | null;
}

const emptyDraftSummary: InboxSnapshot["draftSummary"] = {
  draft: 0,
  queued: 0,
  sending: 0,
  failed: 0,
  total: 0
};

export function useMailboxViewState({
  snapshot
}: UseMailboxViewStateOptions): MailboxViewState {
  const selectedThreadId = useInboxUiStore((state) => state.selectedThreadId);
  const setSelectedThreadId = useInboxUiStore((state) => state.setSelectedThreadId);
  const selectedSection = useInboxUiStore((state) => state.selectedSection);
  const setSelectedSectionState = useInboxUiStore((state) => state.setSelectedSection);
  const searchQuery = useInboxUiStore((state) => state.searchQuery);
  const searchFocusNonce = useInboxUiStore((state) => state.searchFocusNonce);
  const setSearchQueryState = useInboxUiStore((state) => state.setSearchQuery);
  const clearSearchQueryState = useInboxUiStore((state) => state.clearSearchQuery);
  const requestSearchFocusState = useInboxUiStore((state) => state.requestSearchFocus);
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const threads = useMemo(() => snapshot?.threads ?? [], [snapshot?.threads]);
  const navItems = useMemo(() => getMailboxNavItems(threads), [threads]);
  const activeThreads = useMemo(
    () => filterThreadsBySection(threads, selectedSection),
    [selectedSection, threads]
  );
  const visibleThreads = useMemo(
    () =>
      deferredSearchQuery.trim()
        ? searchThreads(threads, deferredSearchQuery)
        : activeThreads,
    [activeThreads, deferredSearchQuery, threads]
  );
  const isSearching = deferredSearchQuery.trim().length > 0;
  const dailyBrief = useMemo(
    () => buildDailyBrief(threads, snapshot?.draftSummary ?? emptyDraftSummary),
    [snapshot?.draftSummary, threads]
  );

  useEffect(() => {
    const selectedStillExists = visibleThreads.some(
      (thread) => thread.thread.id === selectedThreadId
    );

    if (selectedStillExists) {
      return;
    }

    const nextThread = visibleThreads[0] ?? null;
    setSelectedThreadId(nextThread?.thread.id ?? null);
  }, [selectedThreadId, setSelectedThreadId, visibleThreads]);

  const selectedThread = useMemo(() => {
    if (!snapshot) {
      return null;
    }

    return (
      visibleThreads.find((thread) => thread.thread.id === selectedThreadId) ??
      visibleThreads[0] ??
      null
    );
  }, [selectedThreadId, snapshot, visibleThreads]);

  const selectedThreadQueue = useMemo(() => {
    if (!selectedThread || !snapshot) {
      return [];
    }

    return snapshot.queue.filter(
      (record) => record.threadId === selectedThread.thread.id
    );
  }, [selectedThread, snapshot]);

  const senderInsight = useMemo(
    () => buildSenderInsight(selectedThread),
    [selectedThread]
  );
  const calendarContext = useMemo(
    () => buildCalendarContext(selectedThread),
    [selectedThread]
  );

  function selectThread(threadId: string): void {
    startTransition(() => {
      setSelectedThreadId(threadId);
    });
  }

  function setSelectedSection(section: MailboxSectionId): void {
    startTransition(() => {
      setSelectedSectionState(section);
    });
  }

  function moveSelectedThread(delta: number): void {
    if (visibleThreads.length === 0) {
      return;
    }

    const currentIndex = visibleThreads.findIndex(
      (thread) => thread.thread.id === selectedThreadId
    );
    const safeCurrentIndex = currentIndex >= 0 ? currentIndex : 0;
    const nextIndex =
      (safeCurrentIndex + delta + visibleThreads.length) % visibleThreads.length;
    const nextThread = visibleThreads[nextIndex];

    if (!nextThread) {
      return;
    }

    selectThread(nextThread.thread.id);
  }

  return {
    threads,
    activeThreads,
    selectedThread,
    selectedThreadQueue,
    sectionLabel: isSearching ? "Search" : getSectionHeadline(selectedSection),
    sectionDescription: isSearching
      ? `Showing ${visibleThreads.length} local matches for "${deferredSearchQuery.trim()}" across the cached mailbox.`
      : getSectionDescription(selectedSection),
    navItems,
    selectedSection,
    searchQuery,
    isSearching,
    searchFocusNonce,
    visibleThreads,
    setSelectedSection,
    setSearchQuery: setSearchQueryState,
    clearSearchQuery: clearSearchQueryState,
    requestSearchFocus: requestSearchFocusState,
    senderInsight,
    calendarContext,
    dailyBrief,
    selectThread,
    selectNextThread: () => moveSelectedThread(1),
    selectPreviousThread: () => moveSelectedThread(-1)
  };
}
