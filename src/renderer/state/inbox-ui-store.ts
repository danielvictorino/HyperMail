import { create } from "zustand";

export type MailboxSectionId =
  | "inbox"
  | "important"
  | "vip"
  | "waiting"
  | "other"
  | "starred"
  | "snoozed"
  | "archive";

interface InboxUiState {
  selectedThreadId: string | null;
  selectedSection: MailboxSectionId;
  composerOpen: boolean;
  searchQuery: string;
  searchFocusNonce: number;
  setSelectedThreadId: (threadId: string | null) => void;
  setSelectedSection: (section: MailboxSectionId) => void;
  openComposer: () => void;
  closeComposer: () => void;
  toggleComposer: () => void;
  setSearchQuery: (searchQuery: string) => void;
  clearSearchQuery: () => void;
  requestSearchFocus: () => void;
}

export const useInboxUiStore = create<InboxUiState>((set) => ({
  selectedThreadId: null,
  selectedSection: "inbox",
  composerOpen: false,
  searchQuery: "",
  searchFocusNonce: 0,
  setSelectedThreadId: (threadId) => set({ selectedThreadId: threadId }),
  setSelectedSection: (selectedSection) => set({ selectedSection }),
  openComposer: () => set({ composerOpen: true }),
  closeComposer: () => set({ composerOpen: false }),
  toggleComposer: () =>
    set((state) => ({
      composerOpen: !state.composerOpen
    })),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  clearSearchQuery: () => set({ searchQuery: "" }),
  requestSearchFocus: () =>
    set((state) => ({
      searchFocusNonce: state.searchFocusNonce + 1
    }))
}));
