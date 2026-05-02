import { useInboxUiStore } from "../state/inbox-ui-store";

export interface MailboxComposerState {
  composerOpen: boolean;
  openComposer: () => void;
  closeComposer: () => void;
  toggleComposer: () => void;
}

export function useMailboxComposerState(): MailboxComposerState {
  return {
    composerOpen: useInboxUiStore((state) => state.composerOpen),
    openComposer: useInboxUiStore((state) => state.openComposer),
    closeComposer: useInboxUiStore((state) => state.closeComposer),
    toggleComposer: useInboxUiStore((state) => state.toggleComposer)
  };
}
