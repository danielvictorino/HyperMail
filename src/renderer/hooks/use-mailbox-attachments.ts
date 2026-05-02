import { useState } from "react";
import type { LocalMailAttachment, LocalMailMessage } from "@shared/mail/models";
import {
  cacheAttachmentLocally,
  exportCachedAttachment
} from "../offline/attachments/attachment-cache";

export interface MailboxAttachmentState {
  attachmentError: string | null;
  activeAttachmentId: string | null;
  cacheAttachment: (
    message: LocalMailMessage,
    attachment: LocalMailAttachment
  ) => Promise<void>;
}

export function useMailboxAttachments(): MailboxAttachmentState {
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [activeAttachmentId, setActiveAttachmentId] = useState<string | null>(null);

  async function cacheAttachment(
    message: LocalMailMessage,
    attachment: LocalMailAttachment
  ): Promise<void> {
    setActiveAttachmentId(attachment.id);

    try {
      if (attachment.cacheState === "cached") {
        await exportCachedAttachment(message, attachment);
      } else {
        await cacheAttachmentLocally(message, attachment);
      }

      setAttachmentError(null);
    } catch (attachmentFailure) {
      setAttachmentError(
        attachmentFailure instanceof Error
          ? attachmentFailure.message
          : "HyperMail could not open this attachment."
      );
    } finally {
      setActiveAttachmentId(null);
    }
  }

  return {
    attachmentError,
    activeAttachmentId,
    cacheAttachment
  };
}
