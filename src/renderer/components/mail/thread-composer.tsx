import { useEffect, useState } from "react";
import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";
import { EditorContent, useEditor } from "@tiptap/react";
import { Clock3, LoaderCircle, Send, Sparkles } from "lucide-react";
import type { ThreadProjection } from "@shared/mail/models";
import { formatSendLaterLabel, parseNaturalLanguageSendLater } from "@/lib/send-later";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";

interface ThreadComposerProps {
  thread: ThreadProjection;
  open: boolean;
  onClose: () => void;
  loadDraft: (thread: ThreadProjection) => Promise<string | null>;
  saveDraft: (thread: ThreadProjection, bodyHtml: string) => Promise<void>;
  onQueueReply: (thread: ThreadProjection, bodyHtml: string) => Promise<void>;
  onQueueReplyAt: (
    thread: ThreadProjection,
    bodyHtml: string,
    sendAt: number
  ) => Promise<void>;
  onQueueReplyLater: (thread: ThreadProjection, bodyHtml: string) => Promise<void>;
  onGenerateDraft: (thread?: ThreadProjection | null) => Promise<void>;
  isGeneratingDraft: boolean;
  assistantEnabled: boolean;
  draftSeed: {
    threadId: string;
    bodyHtml: string;
    version: number;
  } | null;
  onConsumeDraftSeed: () => void;
}

function createInitialReply(thread: ThreadProjection): string {
  const firstName = thread.thread.participantNames[0]?.split(" ")[0] ?? "there";

  return `<p>Hi ${firstName},</p><p></p><p></p><p>Best,</p>`;
}

export function ThreadComposer({
  thread,
  open,
  onClose,
  loadDraft,
  saveDraft,
  onQueueReply,
  onQueueReplyAt,
  onQueueReplyLater,
  onGenerateDraft,
  isGeneratingDraft,
  assistantEnabled,
  draftSeed,
  onConsumeDraftSeed
}: ThreadComposerProps) {
  const [statusLabel, setStatusLabel] = useState("Local draft");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scheduleInput, setScheduleInput] = useState("");
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false
      }),
      Placeholder.configure({
        placeholder: "Draft a quick reply..."
      })
    ],
    content: createInitialReply(thread),
    editorProps: {
      attributes: {
        class:
          "min-h-[170px] max-h-[300px] overflow-auto px-4 py-4 text-[15px] leading-7 text-foreground/90 focus:outline-none"
      }
    },
    immediatelyRender: false
  });

  useEffect(() => {
    if (!editor || !open) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const storedDraft = await loadDraft(thread);

      if (cancelled) {
        return;
      }

      editor.commands.setContent(storedDraft ?? createInitialReply(thread));
      setStatusLabel(storedDraft ? "Draft restored locally" : "Local draft");
      setScheduleInput("");
    })();

    return () => {
      cancelled = true;
    };
  }, [editor, loadDraft, open, thread]);

  useEffect(() => {
    if (!editor || !open || !draftSeed || draftSeed.threadId !== thread.thread.id) {
      return;
    }

    editor.commands.setContent(draftSeed.bodyHtml);
    setStatusLabel("Voice draft inserted");
    onConsumeDraftSeed();
  }, [draftSeed, editor, onConsumeDraftSeed, open, thread]);

  useEffect(() => {
    if (!editor || !open) {
      return;
    }

    const saveNow = () => {
      const bodyHtml = editor.getHTML();
      setStatusLabel("Saving locally...");
      void saveDraft(thread, bodyHtml)
        .then(() => {
          setStatusLabel("Saved to local outbox");
        })
        .catch(() => {
          setStatusLabel("Local save failed");
        });
    };

    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
    const handleUpdate = () => {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }

      timeoutHandle = setTimeout(saveNow, 250);
    };

    editor.on("update", handleUpdate);

    return () => {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }

      editor.off("update", handleUpdate);
    };
  }, [editor, open, saveDraft, thread]);

  if (!open) {
    return null;
  }

  const parsedSchedule = scheduleInput
    ? parseNaturalLanguageSendLater(scheduleInput)
    : null;
  const scheduleHint = scheduleInput
    ? parsedSchedule
      ? `Will send ${formatSendLaterLabel(parsedSchedule.sendAt)}`
      : "Use phrases like tomorrow 8am, in 2h, or fri 9:30am"
    : "Examples: tomorrow 8am, in 2h, fri 9:30am";

  async function queueSend(mode: "now" | "later"): Promise<void> {
    if (!editor) {
      return;
    }

    setIsSubmitting(true);
    const bodyHtml = editor.getHTML();

    try {
      if (mode === "now") {
        await onQueueReply(thread, bodyHtml);
        setStatusLabel("Queued for delivery");
      } else if (parsedSchedule) {
        await onQueueReplyAt(thread, bodyHtml, parsedSchedule.sendAt);
        setStatusLabel(`Scheduled for ${parsedSchedule.label}`);
      } else {
        await onQueueReplyLater(thread, bodyHtml);
        setStatusLabel("Scheduled for one hour later");
      }

      onClose();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="border-t border-white/[0.08] bg-panel/88">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-foreground">Instant reply</p>
          <p className="mt-1 text-xs text-muted">
            Draft locally, queue through the outbox, and send when ready.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="border-white/[0.1] bg-white/[0.035] text-muted">
            {statusLabel}
          </Badge>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      <div className="border-y border-white/[0.08] bg-panel-strong/32">
        <EditorContent editor={editor} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-[280px] flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
            <Badge className="border-white/[0.1] bg-white/[0.035] text-muted">
              <Sparkles className="mr-1 h-3 w-3" />
              Voice examples local
            </Badge>
            <Badge className="border-white/[0.1] bg-white/[0.035] text-muted">
              <Clock3 className="mr-1 h-3 w-3" />
              Natural language send later
            </Badge>
          </div>
          <div className="hm-input-shell mt-3 px-3 py-2">
            <label className="text-[11px] font-medium text-muted">Schedule</label>
            <input
              value={scheduleInput}
              onChange={(event) => setScheduleInput(event.target.value)}
              placeholder="tomorrow 8am"
              className="mt-2 w-full border-none bg-transparent text-sm text-foreground outline-none placeholder:text-muted"
            />
            <p className="mt-2 text-xs leading-5 text-muted">{scheduleHint}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 border border-white/[0.1] bg-white/[0.035]"
            disabled={!assistantEnabled || isGeneratingDraft || isSubmitting}
            onClick={() => void onGenerateDraft(thread)}
          >
            {isGeneratingDraft ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Draft in my voice
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="gap-2"
            disabled={isSubmitting || (scheduleInput.length > 0 && !parsedSchedule)}
            onClick={() => void queueSend("later")}
          >
            {isSubmitting ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Clock3 className="h-4 w-4" />
            )}
            {parsedSchedule ? "Schedule send" : "Send later"}
          </Button>
          <Button
            size="sm"
            className="gap-2"
            disabled={isSubmitting}
            onClick={() => void queueSend("now")}
          >
            {isSubmitting ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Queue send
          </Button>
        </div>
      </div>
    </div>
  );
}
