import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  ArchiveIcon,
  ClockIcon,
  Cross2Icon,
  EnvelopeClosedIcon,
  FileTextIcon,
  IdCardIcon,
  LightningBoltIcon,
  MagnifyingGlassIcon,
  StarFilledIcon
} from "@radix-ui/react-icons";
import type { ThreadProjection } from "@shared/mail/models";
import { formatThreadTimestamp, isThreadActivelySnoozed } from "@/lib/mailbox-view";
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
    estimateSize: () => 44,
    overscan: 14
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
    <section
      className="flex h-full min-h-0 flex-col border-b border-[rgb(var(--hm-linear-border))] bg-background lg:border-b-0 lg:border-r"
      title={sectionDescription}
    >
      <div className="hm-linear-section-header flex items-center justify-between gap-3 px-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid h-4 w-4 place-items-center rounded-full border border-foreground text-[10px]" />
          <p className="truncate text-[13px] font-medium text-foreground">
            {sectionLabel}
          </p>
          <span className="text-[13px] text-muted">{threads.length}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge className="border-transparent bg-transparent px-0 text-muted">
            {unreadCount} unread
          </Badge>
          <button
            type="button"
            onClick={() => searchInputRef.current?.focus()}
            className="grid h-7 w-7 place-items-center rounded text-muted transition-colors duration-150 hover:bg-[rgb(var(--hm-linear-control))] hover:text-foreground"
            aria-label="Focus mailbox search"
          >
            <MagnifyingGlassIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="border-b border-[rgb(var(--hm-linear-divider))] px-3 py-2">
        <div className="hm-linear-control flex h-8 items-center gap-2 px-2">
          <MagnifyingGlassIcon className="h-4 w-4 shrink-0 text-muted" />
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
            className="w-full bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted"
          />
          <button
            type="button"
            onClick={onClearSearch}
            className={cn(
              "grid h-6 w-6 place-items-center rounded text-muted transition-colors duration-150",
              isSearching ? "hover:bg-white/[0.06] hover:text-foreground" : "opacity-35"
            )}
            aria-label="Clear mailbox search"
          >
            <Cross2Icon className="h-3.5 w-3.5" />
          </button>
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
          <div>
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
  const participantNames = thread.thread.participantNames.join(", ");

  return (
    <button
      type="button"
      onClick={() => onSelect(thread.thread.id)}
      className={cn(
        "hm-linear-table-row grid w-full grid-cols-[22px_minmax(0,104px)_minmax(0,1fr)_auto] items-center gap-2 px-3 text-left text-[13px] transition-colors duration-150",
        selected ? "hm-linear-table-row-selected" : ""
      )}
      title={`${participantNames} - ${thread.thread.subject} - ${thread.thread.snippet}`}
    >
      <span className="flex items-center justify-center">
        {thread.thread.unread ? (
          <span className="h-2 w-2 rounded-full bg-accent" />
        ) : (
          <span className="h-[14px] w-[14px] rounded-full border border-muted/80" />
        )}
      </span>

      <span className="truncate text-muted">{participantNames}</span>

      <span className="flex min-w-0 items-center gap-2">
        <span className="truncate font-normal text-foreground">
          {thread.thread.subject}
        </span>
        <ThreadFlags thread={thread} activelySnoozed={activelySnoozed} />
      </span>

      <span className="flex shrink-0 items-center gap-2 text-[12px] text-muted">
        <span>{formatThreadTimestamp(thread.thread.lastMessageAt)}</span>
        <span className="hidden items-center gap-1 xl:flex">
          <FileTextIcon className="h-3.5 w-3.5" />
          {thread.messages.length}
        </span>
      </span>
    </button>
  );
});

function ThreadFlags({
  thread,
  activelySnoozed
}: {
  thread: ThreadProjection;
  activelySnoozed: boolean;
}) {
  return (
    <span className="hidden shrink-0 items-center gap-1 text-muted xl:flex">
      {thread.thread.starred ? (
        <StarFilledIcon className="h-3.5 w-3.5 text-warning" aria-label="Starred" />
      ) : null}
      {thread.actionNeeded ? (
        <LightningBoltIcon
          className="h-3.5 w-3.5 text-accent"
          aria-label="Action needed"
        />
      ) : null}
      {thread.waitingForReply || activelySnoozed ? (
        <ClockIcon className="h-3.5 w-3.5 text-info" aria-label="Waiting" />
      ) : null}
      {thread.thread.unsubscribedAt ? (
        <EnvelopeClosedIcon
          className="h-3.5 w-3.5 text-positive"
          aria-label="Unsubscribed"
        />
      ) : null}
      {thread.thread.split === "vip" ? (
        <IdCardIcon className="h-3.5 w-3.5 text-vip" aria-label="VIP" />
      ) : null}
      {thread.queueDepth > 0 ? (
        <span className="inline-flex items-center gap-1 rounded bg-info/10 px-1.5 py-0.5 text-[10px] text-info">
          <ArchiveIcon className="h-3 w-3" />
          {thread.queueDepth}
        </span>
      ) : null}
    </span>
  );
}
