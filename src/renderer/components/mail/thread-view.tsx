import { lazy, Suspense, type ReactNode } from "react";
import {
  Archive,
  ArchiveRestore,
  Clock3,
  LoaderCircle,
  MailX,
  Paperclip,
  Reply,
  Sparkles,
  Star,
  UserRound
} from "lucide-react";
import type { MailThreadSummary } from "@shared/ai/mail-assistant";
import type {
  LocalMailAttachment,
  LocalMailMessage,
  ThreadProjection
} from "@shared/mail/models";
import { formatAttachmentSize } from "@/offline/attachments/attachment-cache";
import { formatSnoozedUntil, isThreadActivelySnoozed } from "@/lib/mailbox-view";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";

const LazyThreadComposer = lazy(async () => {
  const module = await import("./thread-composer");
  return {
    default: module.ThreadComposer
  };
});

interface ThreadViewProps {
  thread: ThreadProjection | null;
  effectiveOnline: boolean;
  composerOpen: boolean;
  onOpenComposer: () => void;
  onCloseComposer: () => void;
  onToggleStar: (thread: ThreadProjection) => Promise<void>;
  onToggleArchive: (thread: ThreadProjection) => Promise<void>;
  onSnoozeThread: (thread: ThreadProjection) => Promise<void>;
  onUnsnoozeThread: (thread: ThreadProjection) => Promise<void>;
  onUnsubscribeThread: (thread: ThreadProjection) => Promise<void>;
  loadDraft: (thread: ThreadProjection) => Promise<string | null>;
  saveDraft: (thread: ThreadProjection, bodyHtml: string) => Promise<void>;
  onQueueReply: (thread: ThreadProjection, bodyHtml: string) => Promise<void>;
  onQueueReplyAt: (
    thread: ThreadProjection,
    bodyHtml: string,
    sendAt: number
  ) => Promise<void>;
  onQueueReplyLater: (thread: ThreadProjection, bodyHtml: string) => Promise<void>;
  activeAttachmentId: string | null;
  onCacheAttachment: (
    message: LocalMailMessage,
    attachment: LocalMailAttachment
  ) => Promise<void>;
  assistantEnabled: boolean;
  assistantReason?: string;
  currentSummary: MailThreadSummary | null;
  isSummarizing: boolean;
  isGeneratingDraft: boolean;
  onSummarizeThread: (thread?: ThreadProjection | null) => Promise<void>;
  onGenerateVoiceDraft: (thread?: ThreadProjection | null) => Promise<void>;
  draftSeed: {
    threadId: string;
    bodyHtml: string;
    version: number;
  } | null;
  onConsumeDraftSeed: () => void;
}

function formatLongDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

export function ThreadView({
  thread,
  effectiveOnline,
  composerOpen,
  onOpenComposer,
  onCloseComposer,
  onToggleStar,
  onToggleArchive,
  onSnoozeThread,
  onUnsnoozeThread,
  onUnsubscribeThread,
  loadDraft,
  saveDraft,
  onQueueReply,
  onQueueReplyAt,
  onQueueReplyLater,
  activeAttachmentId,
  onCacheAttachment,
  assistantEnabled,
  assistantReason,
  currentSummary,
  isSummarizing,
  isGeneratingDraft,
  onSummarizeThread,
  onGenerateVoiceDraft,
  draftSeed,
  onConsumeDraftSeed
}: ThreadViewProps) {
  if (!thread) {
    return (
      <div className="grid h-full place-items-center p-8 text-center">
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">No thread selected</p>
          <p className="max-w-sm text-sm leading-6 text-muted">
            Pick a thread from the virtualized list. This pane stays focused on one
            conversation at a time and keeps actions within immediate reach.
          </p>
        </div>
      </div>
    );
  }

  const activelySnoozed = isThreadActivelySnoozed(thread.thread);
  const canUnsubscribe =
    Boolean(thread.thread.unsubscribe) && !thread.thread.unsubscribedAt;

  return (
    <section className="flex h-full min-h-0 flex-col bg-panel/60">
      <div className="border-b border-white/10 px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-white/10 bg-white/[0.03] text-muted">
                {thread.thread.split}
              </Badge>
              {thread.queueDepth > 0 ? (
                <Badge className="border-sky-400/20 bg-sky-400/10 text-sky-100">
                  {thread.queueDepth} queued
                </Badge>
              ) : null}
              {activelySnoozed && thread.thread.snoozedUntil ? (
                <Badge className="border-sky-400/20 bg-sky-400/10 text-sky-100">
                  Until {formatSnoozedUntil(thread.thread.snoozedUntil)}
                </Badge>
              ) : null}
              {thread.thread.unsubscribedAt ? (
                <Badge className="border-emerald-400/20 bg-emerald-400/10 text-emerald-100">
                  Unsubscribed
                </Badge>
              ) : null}
              <Badge
                className={
                  effectiveOnline
                    ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
                    : "border-amber-400/20 bg-amber-400/10 text-amber-100"
                }
              >
                {effectiveOnline ? "Syncing live" : "Offline hold"}
              </Badge>
            </div>

            <h2 className="text-[27px] font-semibold tracking-hyper text-foreground">
              {thread.thread.subject}
            </h2>
            <p className="text-sm text-muted">
              {thread.thread.participantNames.join(", ")}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ActionButton
              label="Summarize"
              hint="A"
              icon={
                isSummarizing ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )
              }
              disabled={!assistantEnabled || isSummarizing}
              onClick={() => void onSummarizeThread(thread)}
            />
            <ActionButton
              label={thread.thread.starred ? "Unstar" : "Star"}
              hint="S"
              active={thread.thread.starred}
              icon={<Star className="h-4 w-4" />}
              onClick={() => void onToggleStar(thread)}
            />
            <ActionButton
              label="Voice Draft"
              hint="D"
              icon={
                isGeneratingDraft ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Reply className="h-4 w-4" />
                )
              }
              disabled={!assistantEnabled || isGeneratingDraft}
              onClick={() => void onGenerateVoiceDraft(thread)}
            />
            <ActionButton
              label={activelySnoozed ? "Unsnooze" : "Snooze"}
              hint="Z"
              icon={<Clock3 className="h-4 w-4" />}
              onClick={() =>
                void (activelySnoozed
                  ? onUnsnoozeThread(thread)
                  : onSnoozeThread(thread))
              }
            />
            <ActionButton
              label={thread.thread.unsubscribedAt ? "Unsubscribed" : "Unsubscribe"}
              hint="U"
              icon={<MailX className="h-4 w-4" />}
              active={Boolean(thread.thread.unsubscribedAt)}
              disabled={!canUnsubscribe}
              onClick={() => void onUnsubscribeThread(thread)}
            />
            <ActionButton
              label={thread.thread.archived ? "Restore" : "Archive"}
              hint="E"
              icon={
                thread.thread.archived ? (
                  <ArchiveRestore className="h-4 w-4" />
                ) : (
                  <Archive className="h-4 w-4" />
                )
              }
              onClick={() => void onToggleArchive(thread)}
            />
            <ActionButton
              label="Reply"
              hint="R"
              icon={<Reply className="h-4 w-4" />}
              onClick={onOpenComposer}
            />
          </div>
        </div>
        {!assistantEnabled && assistantReason ? (
          <p className="mt-3 text-xs leading-5 text-muted">{assistantReason}</p>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        <div className="space-y-4">
          {thread.messages.map((message, index) => (
            <article
              key={message.id}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
            >
              <div className="mb-4 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-black/15 text-muted">
                    <UserRound className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {message.fromName}
                    </p>
                    <p className="mt-1 text-xs text-muted">{message.fromEmail}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted">
                  <Clock3 className="h-3.5 w-3.5" />
                  <span>{formatLongDate(message.sentAt)}</span>
                  {message.deliveryState && message.deliveryState !== "sent" ? (
                    <Badge className="border-white/10 bg-white/[0.03] text-muted">
                      {message.deliveryState}
                    </Badge>
                  ) : null}
                </div>
              </div>

              {index === 0 ? (
                <p className="mb-4 text-sm leading-6 text-muted">
                  {currentSummary
                    ? `AI brief: ${currentSummary.headline}`
                    : `Thread summary: ${thread.thread.snippet}`}
                </p>
              ) : null}

              <p className="whitespace-pre-wrap text-[15px] leading-7 text-slate-100">
                {message.bodyPlain}
              </p>

              {message.attachments.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {message.attachments.map((attachment) => (
                    <button
                      key={attachment.id}
                      type="button"
                      disabled={activeAttachmentId === attachment.id}
                      onClick={() => void onCacheAttachment(message, attachment)}
                      className="rounded-xl border border-white/10 bg-black/10 px-3 py-2 text-left transition-colors duration-150 hover:bg-black/20"
                    >
                      <div className="flex items-center gap-2 text-sm text-foreground">
                        {activeAttachmentId === attachment.id ? (
                          <LoaderCircle className="h-3.5 w-3.5 animate-spin text-accent" />
                        ) : (
                          <Paperclip className="h-3.5 w-3.5 text-accent" />
                        )}
                        <span>{attachment.filename}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted">
                        <span>{formatAttachmentSize(attachment.size)}</span>
                        <span>·</span>
                        <span>
                          {activeAttachmentId === attachment.id
                            ? attachment.cacheState === "cached"
                              ? "Saving copy"
                              : "Caching locally"
                            : attachment.cacheState === "cached"
                              ? "Cached offline · Save copy"
                              : "Not cached · Cache locally"}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </div>

      <Suspense
        fallback={
          composerOpen ? (
            <div className="border-t border-white/10 px-5 py-4 text-sm text-muted">
              Loading composer...
            </div>
          ) : null
        }
      >
        <LazyThreadComposer
          thread={thread}
          open={composerOpen}
          onClose={onCloseComposer}
          loadDraft={loadDraft}
          saveDraft={saveDraft}
          onQueueReply={onQueueReply}
          onQueueReplyAt={onQueueReplyAt}
          onQueueReplyLater={onQueueReplyLater}
          onGenerateDraft={onGenerateVoiceDraft}
          isGeneratingDraft={isGeneratingDraft}
          assistantEnabled={assistantEnabled}
          draftSeed={draftSeed}
          onConsumeDraftSeed={onConsumeDraftSeed}
        />
      </Suspense>
    </section>
  );
}

interface ActionButtonProps {
  label: string;
  hint: string;
  icon: ReactNode;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}

function ActionButton({
  label,
  hint,
  icon,
  onClick,
  active,
  disabled
}: ActionButtonProps) {
  return (
    <Button
      variant={active ? "primary" : "secondary"}
      size="sm"
      className="gap-2"
      disabled={disabled}
      onClick={onClick}
    >
      {icon}
      {label}
      <Badge className="border-white/10 bg-black/10 text-inherit">{hint}</Badge>
    </Button>
  );
}
