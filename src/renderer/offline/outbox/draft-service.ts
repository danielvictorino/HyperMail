import type {
  LocalMailDraft,
  LocalMailMessage,
  ThreadProjection
} from "@shared/mail/models";
import {
  hypermailDb,
  loadThreadSnapshot,
  writeThreadSnapshot,
  type HypermailDatabase
} from "../db/hypermail-db";

function createDraftId(threadId: string): string {
  return `${threadId}:draft`;
}

function createClientMessageId(threadId: string): string {
  return `${threadId}:outgoing:${crypto.randomUUID()}`;
}

function toReplySubject(subject: string): string {
  return subject.toLowerCase().startsWith("re:") ? subject : `Re: ${subject}`;
}

function htmlToPlainText(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function buildDraftRecord(
  thread: ThreadProjection,
  accountEmail: string,
  bodyHtml: string,
  existingDraft?: LocalMailDraft
): LocalMailDraft {
  const newestMessage = thread.messages[thread.messages.length - 1];

  return {
    id: existingDraft?.id ?? createDraftId(thread.thread.id),
    accountId: thread.thread.accountId,
    threadId: thread.thread.id,
    replyToMessageId: newestMessage?.id,
    clientMessageId:
      existingDraft?.clientMessageId ?? createClientMessageId(thread.thread.id),
    to: thread.thread.participantEmails.filter(
      (email) => email.toLowerCase() !== accountEmail.toLowerCase()
    ),
    cc: existingDraft?.cc ?? [],
    bcc: existingDraft?.bcc ?? [],
    subject: toReplySubject(thread.thread.subject),
    bodyHtml,
    status: existingDraft?.status ?? "draft",
    sendAt: existingDraft?.sendAt ?? null,
    updatedAt: Date.now(),
    lastError: existingDraft?.lastError
  };
}

export async function getDraftForThread(
  accountId: string,
  threadId: string,
  database = hypermailDb
): Promise<LocalMailDraft | null> {
  const drafts = await database.drafts.where("accountId").equals(accountId).toArray();

  return (
    drafts
      .filter(
        (draft) =>
          draft.threadId === threadId &&
          (draft.status === "draft" || draft.status === "failed")
      )
      .sort((left, right) => right.updatedAt - left.updatedAt)[0] ?? null
  );
}

export async function saveDraftForThread(
  thread: ThreadProjection,
  bodyHtml: string,
  database = hypermailDb
): Promise<LocalMailDraft> {
  const account = await database.accounts.get(thread.thread.accountId);
  const existingDraft = await getDraftForThread(
    thread.thread.accountId,
    thread.thread.id,
    database
  );
  const draft = buildDraftRecord(
    thread,
    account?.email ?? "",
    bodyHtml,
    existingDraft ?? undefined
  );
  draft.status = "draft";
  draft.sendAt = null;
  draft.lastError = undefined;

  await database.drafts.put(draft);
  return draft;
}

export async function queueDraftForDelivery(
  thread: ThreadProjection,
  bodyHtml: string,
  sendAt: number | null,
  database = hypermailDb
): Promise<LocalMailDraft> {
  const account = await database.accounts.get(thread.thread.accountId);
  const existingDraft = await getDraftForThread(
    thread.thread.accountId,
    thread.thread.id,
    database
  );
  const draft = buildDraftRecord(
    thread,
    account?.email ?? "",
    bodyHtml,
    existingDraft ?? undefined
  );
  draft.status = "queued";
  draft.sendAt = sendAt;
  draft.lastError = undefined;

  await database.transaction(
    "rw",
    database.drafts,
    database.threads,
    database.messages,
    async () => {
      await database.drafts.put(draft);
      await upsertOptimisticOutgoingMessage(
        thread.thread.id,
        draft,
        {
          email: account?.email ?? "you@hypermail.local",
          displayName: account?.displayName ?? "You"
        },
        database
      );
    }
  );

  return draft;
}

async function upsertOptimisticOutgoingMessage(
  threadId: string,
  draft: LocalMailDraft,
  accountIdentity: {
    email: string;
    displayName: string;
  },
  database: HypermailDatabase
): Promise<void> {
  const snapshot = await loadThreadSnapshot(database, threadId);

  if (!snapshot) {
    return;
  }

  const bodyPlain = htmlToPlainText(draft.bodyHtml);
  const optimisticMessage: LocalMailMessage = {
    id: draft.clientMessageId,
    accountId: draft.accountId,
    threadId,
    subject: draft.subject,
    fromName: accountIdentity.displayName,
    fromEmail: accountIdentity.email,
    to: [...draft.to],
    cc: [...draft.cc],
    bodyPlain,
    unread: false,
    starred: snapshot.thread.starred,
    archived: false,
    labelIds: ["SENT"],
    attachments: [],
    deliveryState: "queued",
    draftId: draft.id,
    sentAt: draft.sendAt ?? Date.now()
  };

  const existingIndex = snapshot.messages.findIndex(
    (message) => message.id === draft.clientMessageId
  );

  if (existingIndex >= 0) {
    snapshot.messages[existingIndex] = optimisticMessage;
  } else {
    snapshot.messages.push(optimisticMessage);
  }

  snapshot.messages.sort((left, right) => left.sentAt - right.sentAt);
  snapshot.thread.archived = false;
  snapshot.thread.unread = false;
  snapshot.thread.lastMessageAt = optimisticMessage.sentAt;
  snapshot.thread.updatedAt = Date.now();
  snapshot.thread.snippet = bodyPlain.slice(0, 180) || snapshot.thread.snippet;
  snapshot.thread.messageIds = snapshot.messages.map((message) => message.id);

  await writeThreadSnapshot(database, snapshot);
}

export async function markDraftSending(
  draftId: string,
  database = hypermailDb
): Promise<void> {
  const draft = await database.drafts.get(draftId);

  if (!draft) {
    return;
  }

  await database.transaction("rw", database.drafts, database.messages, async () => {
    await database.drafts.update(draftId, {
      status: "sending",
      updatedAt: Date.now(),
      lastError: undefined
    });

    await database.messages.update(draft.clientMessageId, {
      deliveryState: "sending",
      sentAt: Date.now()
    });
  });
}

export async function markDraftDelivered(
  draft: LocalMailDraft,
  sentAt: number,
  database = hypermailDb
): Promise<void> {
  await database.transaction(
    "rw",
    database.drafts,
    database.messages,
    database.threads,
    async () => {
      await database.messages.update(draft.clientMessageId, {
        deliveryState: "sent",
        sentAt
      });

      const thread = await database.threads.get(draft.threadId ?? "");

      if (thread) {
        thread.lastMessageAt = sentAt;
        thread.updatedAt = sentAt;
        await database.threads.put(thread);
      }

      await database.drafts.delete(draft.id);
    }
  );
}

export async function markDraftFailed(
  draft: LocalMailDraft,
  message: string,
  database = hypermailDb
): Promise<void> {
  await database.transaction("rw", database.drafts, database.messages, async () => {
    await database.drafts.update(draft.id, {
      status: "failed",
      updatedAt: Date.now(),
      lastError: message
    });

    await database.messages.update(draft.clientMessageId, {
      deliveryState: "failed"
    });
  });
}
