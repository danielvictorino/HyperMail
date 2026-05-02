import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Archive,
  Clock3,
  MailX,
  Paperclip,
  Search,
  Sparkles,
  Star,
  X
} from "lucide-react";
import type { ThreadProjection } from "@shared/mail/models";
import {
  formatSnoozedUntil,
  formatThreadTimestamp,
  isThreadActivelySnoozed
} from "@/lib/mailbox-view";
import { cn } from "@/lib/utils";
import { Badge } from "../ui/badge";
import { InboxZeroArtwork } from "./inbox-zero-artwork";

interface VirtualThreadListProps {
  sectionLabel: string;
  sectionDescription: string;
  threads: ThreadProjection[];
  searchQuery: string;
  searchFocusNonce: number;
  selectedThreadId: string | null;
  onSearchQueryChange: (searchQuery: string) => void;
  onClearSearch: () => void;
  onSelectThread: (threadId: string) => void;
}

export function VirtualThreadList({
  sectionLabel,
  sectionDescription,
  threads,
  searchQuery,
  searchFocusNonce,
  selectedThreadId,
  onSearchQueryChange,
  onClearSearch,
  onSelectThread
}: VirtualThreadListProps) {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const rowVirtualizer = useVirtualizer({
    count: threads.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 138,
    overscan: 8
  });

  const items = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();
  const topSpacer = items[0]?.start ?? 0;
  const bottomSpacer = totalSize - (items[items.length - 1]?.end ?? 0);
  const unreadCount = useMemo(
    () => threads.filter((thread) => thread.thread.unread).length,
    [threads]
  );
  const isSearching = searchQuery.trim().length > 0;
  const handleSelectThread = useCallback(
    (threadId: string) => onSelectThread(threadId),
    [onSelectThread]
  );

  useEffect(() => {
    searchInputRef.current?.focus();
    searchInputRef.current?.select();
  }, [searchFocusNonce]);

  return (
    <section className="flex h-full min-h-0 flex-col border-b border-white/10 lg:border-b-0 lg:border-r">
      <div className="border-b border-white/10 px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase text-muted">{sectionLabel}</p>
            <h2 className="mt-1 text-lg font-semibold text-foreground">
              {threads.length} threads
            </h2>
          </div>
          <Badge className="border-accent/25 bg-accent/10 text-accent">
            {unreadCount} unread
          </Badge>
        </div>
        <p className="mt-2 text-sm leading-6 text-muted">{sectionDescription}</p>
        <div className="hm-input-shell mt-4 flex items-center gap-3 px-3 py-2.5">
          <Search className="h-4 w-4 shrink-0 text-muted" />
          <input
            ref={searchInputRef}
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                onClearSearch();
                searchInputRef.current?.blur();
              }
            }}
            placeholder="Search cached mail"
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted"
          />
          <button
            type="button"
            onClick={onClearSearch}
            className={cn(
              "grid h-7 w-7 place-items-center rounded-full border border-white/10 text-muted transition-colors duration-150",
              isSearching ? "hover:bg-white/[0.06] hover:text-foreground" : "opacity-40"
            )}
            aria-label="Clear mailbox search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] uppercase text-muted">
          <span>{isSearching ? "Local search" : "Working set"}</span>
          <span>{isSearching ? "Shortcut /" : "Cached only"}</span>
        </div>
      </div>

      <div ref={parentRef} className="flex-1 overflow-auto">
        {threads.length === 0 ? (
          <div className="grid h-full place-items-center p-8 text-center">
            {isSearching ? (
              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground">No local matches</p>
                <p className="max-w-xs text-sm leading-6 text-muted">
                  Search only hits the cached mailbox. Try a sender, subject fragment,
                  or a phrase from the thread body.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                <InboxZeroArtwork sectionLabel={sectionLabel} />
                <div className="space-y-3">
                  <p className="text-sm font-medium text-foreground">
                    {sectionLabel === "All inbox"
                      ? "Inbox Zero"
                      : `${sectionLabel} cleared`}
                  </p>
                  <p className="max-w-xs text-sm leading-6 text-muted">
                    HyperMail keeps the empty state intentional. The daily artwork
                    changes with the date, so clearing a split feels like progress
                    instead of dead space.
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="px-2 py-2">
            <div style={{ height: topSpacer }} />
            {items.map((item) => {
              const thread = threads[item.index];
              if (!thread) {
                return null;
              }
              return (
                <ThreadRow
                  key={thread.thread.id}
                  thread={thread}
                  selected={selectedThreadId === thread.thread.id}
                  onSelect={handleSelectThread}
                />
              );
            })}
            <div style={{ height: bottomSpacer }} />
          </div>
        )}
      </div>
    </section>
  );
}

interface ThreadRowProps {
  thread: ThreadProjection;
  selected: boolean;
  onSelect: (threadId: string) => void;
}

const ThreadRow = memo(function ThreadRow({
  thread,
  selected,
  onSelect
}: ThreadRowProps) {
  const activelySnoozed = isThreadActivelySnoozed(thread.thread);
  return (
    <button
      type="button"
      onClick={() => onSelect(thread.thread.id)}
      className={cn(
        "mb-2 w-full px-4 py-3 text-left transition-all duration-150 ease-hyper",
        selected
          ? "hm-list-row-selected"
          : "hm-list-row hover:border-white/10 hover:bg-white/[0.05]"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {thread.thread.unread ? (
              <span className="inline-block h-2 w-2 rounded-full bg-accent" />
            ) : null}
            <p className="truncate text-sm font-medium text-foreground">
              {thread.thread.participantNames.join(", ")}
            </p>
          </div>
          <p className="mt-1 truncate text-sm text-foreground/90">
            {thread.thread.subject}
          </p>
        </div>
        <span className="shrink-0 text-[11px] uppercase text-muted">
          {formatThreadTimestamp(thread.thread.lastMessageAt)}
        </span>
      </div>

      <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">
        {thread.thread.snippet}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {thread.thread.starred ? (
          <Badge className="border-amber-400/20 bg-amber-400/10 text-amber-100">
            <Star className="mr-1 h-3 w-3" />
            Starred
          </Badge>
        ) : null}
        {thread.actionNeeded ? (
          <Badge className="border-accent/25 bg-accent/10 text-accent">
            <Sparkles className="mr-1 h-3 w-3" />
            Action
          </Badge>
        ) : null}
        {thread.waitingForReply ? (
          <Badge className="border-sky-400/20 bg-sky-400/10 text-sky-100">
            <Clock3 className="mr-1 h-3 w-3" />
            Waiting
          </Badge>
        ) : null}
        {thread.localRuleSplit && thread.localRuleSplit !== thread.thread.split ? (
          <Badge className="border-white/10 bg-white/[0.03] text-muted">
            Rule: {thread.localRuleSplit}
          </Badge>
        ) : null}
        {activelySnoozed && thread.thread.snoozedUntil ? (
          <Badge className="border-sky-400/20 bg-sky-400/10 text-sky-100">
            <Clock3 className="mr-1 h-3 w-3" />
            Until {formatSnoozedUntil(thread.thread.snoozedUntil)}
          </Badge>
        ) : null}
        {thread.thread.unsubscribedAt ? (
          <Badge className="border-emerald-400/20 bg-emerald-400/10 text-emerald-100">
            <MailX className="mr-1 h-3 w-3" />
            Unsubscribed
          </Badge>
        ) : null}
        {thread.thread.split === "vip" ? (
          <Badge className="border-pink-400/20 bg-pink-400/10 text-pink-100">
            <Sparkles className="mr-1 h-3 w-3" />
            VIP
          </Badge>
        ) : null}
        <Badge className="border-white/10 bg-white/[0.03] text-muted">
          <Paperclip className="mr-1 h-3 w-3" />
          {thread.messages.length} msgs
        </Badge>
        {thread.queueDepth > 0 ? (
          <Badge className="border-sky-400/20 bg-sky-400/10 text-sky-100">
            <Archive className="mr-1 h-3 w-3" />
            {thread.queueDepth} queued
          </Badge>
        ) : null}
      </div>
    </button>
  );
});
