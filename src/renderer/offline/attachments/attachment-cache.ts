import type {
  CachedAttachmentPayload,
  SaveCachedAttachmentResult
} from "@shared/contracts";
import { isGoogleAccountId } from "@shared/mail/provider-ids";
import type { LocalMailAttachment, LocalMailMessage } from "@shared/mail/models";
import { getDesktopApi } from "@/lib/desktop-api";
import { hypermailDb } from "../db/hypermail-db";

export async function cacheAttachmentLocally(
  message: LocalMailMessage,
  attachment: LocalMailAttachment,
  database = hypermailDb
): Promise<CachedAttachmentPayload> {
  const existingPayload = await database.attachmentCache.get(
    getCachedAttachmentRecordId(message, attachment)
  );

  if (existingPayload) {
    await markAttachmentAsCached(message, attachment, database);
    return existingPayload;
  }

  const payload =
    isGoogleAccountId(message.accountId) && attachment.attachmentId
      ? await getDesktopApi().mail.downloadGmailAttachment({
          accountId: message.accountId,
          threadId: message.threadId,
          messageId: message.id,
          attachmentId: attachment.attachmentId,
          filename: attachment.filename,
          mimeType: attachment.mimeType,
          size: attachment.size
        })
      : createDemoAttachmentPayload(message, attachment);

  await database.transaction(
    "rw",
    database.attachmentCache,
    database.messages,
    async () => {
      await database.attachmentCache.put({
        ...payload,
        updatedAt: payload.downloadedAt
      });

      await markAttachmentAsCached(message, attachment, database);
    }
  );

  return payload;
}

export async function exportCachedAttachment(
  message: LocalMailMessage,
  attachment: LocalMailAttachment,
  database = hypermailDb
): Promise<SaveCachedAttachmentResult> {
  const payload = await database.attachmentCache.get(
    getCachedAttachmentRecordId(message, attachment)
  );

  if (!payload) {
    throw new Error("Cache this attachment locally before exporting it.");
  }

  return await getDesktopApi().mail.saveCachedAttachment(payload);
}

function createDemoAttachmentPayload(
  message: LocalMailMessage,
  attachment: LocalMailAttachment
): CachedAttachmentPayload {
  const downloadedAt = Date.now();
  const content = Buffer.from(
    `HyperMail cached attachment placeholder\n\nMessage: ${message.subject}\nAttachment: ${attachment.filename}\n`
  ).toString("base64");

  return {
    id: getCachedAttachmentRecordId(message, attachment),
    accountId: message.accountId,
    threadId: message.threadId,
    messageId: message.id,
    attachmentId: attachment.attachmentId ?? attachment.id,
    filename: attachment.filename,
    mimeType: attachment.mimeType,
    size: attachment.size,
    contentBase64: content,
    downloadedAt
  };
}

async function markAttachmentAsCached(
  message: LocalMailMessage,
  attachment: LocalMailAttachment,
  database: typeof hypermailDb
): Promise<void> {
  const nextAttachments = message.attachments.map((item) =>
    item.id === attachment.id ? { ...item, cacheState: "cached" as const } : item
  );

  await database.messages.update(message.id, {
    attachments: nextAttachments
  });
}

function getCachedAttachmentRecordId(
  message: LocalMailMessage,
  attachment: LocalMailAttachment
): string {
  return `${message.id}:attachment-cache:${attachment.attachmentId ?? attachment.id}`;
}

export function formatAttachmentSize(size: number): string {
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (size >= 1024) {
    return `${Math.round(size / 1024)} KB`;
  }

  return `${size} B`;
}
