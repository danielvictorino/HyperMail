import type { GmailAccountProfile } from "../contracts";
import type {
  InboxSplit,
  LocalMailAccount,
  LocalMailLabel,
  LocalMailMessage,
  LocalMailUnsubscribe,
  ThreadSnapshot
} from "./models";
import { createProviderAccountId } from "./provider-ids";
import { isSafeRemoteHttpsUrl } from "../security/url-safety";

export interface GmailLabelResource {
  id: string;
  name: string;
  type: "system" | "user";
  color?: {
    backgroundColor?: string;
    textColor?: string;
  };
}

export interface GmailHeader {
  name: string;
  value: string;
}

export interface GmailMessageBody {
  size?: number;
  data?: string;
  attachmentId?: string;
}

export interface GmailMessagePart {
  partId?: string;
  mimeType?: string;
  filename?: string;
  headers?: GmailHeader[];
  body?: GmailMessageBody;
  parts?: GmailMessagePart[];
}

export interface GmailMessageResource {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  payload?: GmailMessagePart;
  internalDate?: string;
}

export interface GmailThreadResource {
  id: string;
  historyId?: string;
  snippet?: string;
  messages?: GmailMessageResource[];
}

interface ParsedAddress {
  email: string;
  name?: string;
}

interface GoogleLocalAccountOptions {
  profile: GmailAccountProfile;
  connectedAt: number;
}

const LABEL_COLOR_FALLBACKS: Record<string, string> = {
  INBOX: "#6b7280",
  IMPORTANT: "#f59e0b",
  STARRED: "#a27eff",
  CATEGORY_PERSONAL: "#0ea5e9",
  CATEGORY_UPDATES: "#14b8a6",
  CATEGORY_PROMOTIONS: "#8b5cf6"
};

export function createGoogleAccountId(email: string): string {
  return createProviderAccountId("google", email);
}

export function createGoogleThreadLocalId(
  accountId: string,
  remoteThreadId: string
): string {
  return `${accountId}:thread:${remoteThreadId}`;
}

export function createGoogleMessageLocalId(
  accountId: string,
  remoteMessageId: string
): string {
  return `${accountId}:message:${remoteMessageId}`;
}

export function getGoogleRemoteMessageId(
  accountId: string,
  localMessageId: string
): string {
  const prefix = `${accountId}:message:`;

  if (!localMessageId.startsWith(prefix)) {
    throw new Error(`Message ${localMessageId} does not belong to ${accountId}.`);
  }

  return localMessageId.slice(prefix.length);
}

export function getGoogleRemoteThreadId(
  accountId: string,
  localThreadId: string
): string {
  const prefix = `${accountId}:thread:`;

  if (!localThreadId.startsWith(prefix)) {
    throw new Error(`Thread ${localThreadId} does not belong to ${accountId}.`);
  }

  return localThreadId.slice(prefix.length);
}

export function createGoogleLocalAccount({
  profile,
  connectedAt
}: GoogleLocalAccountOptions): LocalMailAccount {
  const accountId = createGoogleAccountId(profile.email);
  const now = Date.now();

  return {
    id: accountId,
    email: profile.email,
    displayName: profile.name ?? profile.email,
    provider: "google",
    connectedAt,
    updatedAt: now
  };
}

export function mapGmailLabelsToLocal(
  accountId: string,
  labels: GmailLabelResource[]
): LocalMailLabel[] {
  return labels.map((label) => ({
    id: `${accountId}:label:${label.id}`,
    accountId,
    name: label.name,
    color: label.color?.backgroundColor ?? LABEL_COLOR_FALLBACKS[label.id] ?? "#52525b",
    kind: label.type
  }));
}

export function mapGmailThreadToSnapshot(
  account: Pick<LocalMailAccount, "id" | "email" | "displayName">,
  thread: GmailThreadResource
): ThreadSnapshot | null {
  const messages = (thread.messages ?? [])
    .map((message) => mapGmailMessageToLocal(account, message))
    .filter((message): message is LocalMailMessage => message !== null)
    .sort((left, right) => left.sentAt - right.sentAt);

  if (messages.length === 0) {
    return null;
  }

  const labelIds = [...new Set(messages.flatMap((message) => message.labelIds))];

  if (labelIds.includes("SPAM") || labelIds.includes("TRASH")) {
    return null;
  }

  const latestMessage = messages[messages.length - 1] ?? messages[0];
  const unsubscribe = deriveThreadUnsubscribe(account, thread.messages ?? []);

  if (!latestMessage) {
    return null;
  }

  const correspondents = collectCorrespondents(account.email, thread.messages ?? []);
  const participantEmails = correspondents.map((participant) => participant.email) || [
    latestMessage.fromEmail
  ];
  const participantNames = correspondents.map(
    (participant) => participant.name?.trim() || participant.email
  ) || [latestMessage.fromName || latestMessage.fromEmail];
  const safeParticipantEmails =
    participantEmails.length > 0 ? participantEmails : [latestMessage.fromEmail];
  const safeParticipantNames =
    participantNames.length > 0
      ? participantNames
      : [latestMessage.fromName || latestMessage.fromEmail];

  return {
    thread: {
      id: createGoogleThreadLocalId(account.id, thread.id),
      accountId: account.id,
      subject: latestMessage.subject || "(No subject)",
      snippet: thread.snippet?.trim() || latestMessage.bodyPlain.slice(0, 180),
      participantNames: safeParticipantNames,
      participantEmails: safeParticipantEmails,
      split: deriveSplit(
        labelIds,
        latestMessage,
        account.email,
        thread.snippet?.trim() || latestMessage.bodyPlain
      ),
      unread: labelIds.includes("UNREAD"),
      starred: labelIds.includes("STARRED"),
      archived: !labelIds.includes("INBOX"),
      snoozedUntil: null,
      unsubscribe,
      unsubscribedAt: null,
      lastMessageAt: latestMessage.sentAt,
      messageIds: messages.map((message) => message.id),
      updatedAt: latestMessage.sentAt
    },
    messages
  };
}

function mapGmailMessageToLocal(
  account: Pick<LocalMailAccount, "id" | "email" | "displayName">,
  message: GmailMessageResource
): LocalMailMessage | null {
  const headers = toHeaderMap(message.payload?.headers ?? []);
  const from = parseAddress(headers.get("from"));
  const subject = headers.get("subject") ?? "(No subject)";
  const labelIds = [...(message.labelIds ?? [])];

  if (labelIds.includes("DRAFT")) {
    return null;
  }

  return {
    id: createGoogleMessageLocalId(account.id, message.id),
    accountId: account.id,
    threadId: createGoogleThreadLocalId(account.id, message.threadId),
    subject,
    fromName: from?.name ?? from?.email ?? "Unknown sender",
    fromEmail: from?.email ?? "unknown@example.com",
    to: parseAddressList(headers.get("to")).map((entry) => entry.email),
    cc: parseAddressList(headers.get("cc")).map((entry) => entry.email),
    bodyPlain:
      extractPreferredBody(message.payload) ||
      message.snippet?.trim() ||
      "(No preview available)",
    unread: labelIds.includes("UNREAD"),
    starred: labelIds.includes("STARRED"),
    archived: !labelIds.includes("INBOX"),
    labelIds,
    attachments: extractAttachments(account.id, message.id, message.payload),
    deliveryState: "sent",
    sentAt: parseSentAt(headers.get("date"), message.internalDate)
  };
}

function deriveSplit(
  labelIds: string[],
  latestMessage: LocalMailMessage,
  accountEmail: string,
  snippet: string
): InboxSplit {
  if (labelIds.includes("VIP")) {
    return "vip";
  }

  if (
    labelIds.includes("IMPORTANT") ||
    labelIds.includes("CATEGORY_PERSONAL") ||
    looksImportant(latestMessage, accountEmail, snippet)
  ) {
    return "important";
  }

  return "other";
}

function looksImportant(
  message: LocalMailMessage,
  accountEmail: string,
  snippet: string
): boolean {
  const sender = message.fromEmail.toLowerCase();
  const automatedSender =
    sender.includes("no-reply") ||
    sender.includes("noreply") ||
    sender.includes("notifications@");
  const directConversation = message.to.some(
    (recipient) => recipient.toLowerCase() === accountEmail.toLowerCase()
  );
  const urgencySignals = [
    "can you",
    "could you",
    "review",
    "today",
    "tomorrow",
    "deadline",
    "launch",
    "demo",
    "meeting",
    "follow up",
    "need your",
    "quick look"
  ];
  const haystack = `${message.subject} ${snippet}`.toLowerCase();

  return (
    !automatedSender &&
    directConversation &&
    urgencySignals.some((signal) => haystack.includes(signal))
  );
}

function collectCorrespondents(
  accountEmail: string,
  messages: GmailMessageResource[]
): ParsedAddress[] {
  const correspondents = new Map<string, ParsedAddress>();

  for (const message of messages) {
    const headers = toHeaderMap(message.payload?.headers ?? []);
    const from = parseAddress(headers.get("from"));
    const to = parseAddressList(headers.get("to"));
    const cc = parseAddressList(headers.get("cc"));

    for (const participant of [from, ...to, ...cc]) {
      if (!participant) {
        continue;
      }

      if (participant.email.toLowerCase() === accountEmail.toLowerCase()) {
        continue;
      }

      correspondents.set(participant.email.toLowerCase(), participant);
    }
  }

  return [...correspondents.values()].slice(0, 4);
}

function deriveThreadUnsubscribe(
  account: Pick<LocalMailAccount, "id" | "email">,
  messages: GmailMessageResource[]
): LocalMailUnsubscribe | null {
  const orderedMessages = [...messages].sort((left, right) => {
    const leftHeaders = toHeaderMap(left.payload?.headers ?? []);
    const rightHeaders = toHeaderMap(right.payload?.headers ?? []);

    return (
      parseSentAt(rightHeaders.get("date"), right.internalDate) -
      parseSentAt(leftHeaders.get("date"), left.internalDate)
    );
  });

  for (const message of orderedMessages) {
    const headers = toHeaderMap(message.payload?.headers ?? []);
    const from = parseAddress(headers.get("from"));

    if (from?.email.toLowerCase() === account.email.toLowerCase()) {
      continue;
    }

    const parsed = parseListUnsubscribeHeader({
      accountId: account.id,
      remoteMessageId: message.id,
      listUnsubscribe: headers.get("list-unsubscribe"),
      listUnsubscribePost: headers.get("list-unsubscribe-post")
    });

    if (parsed) {
      return parsed;
    }
  }

  return null;
}

function toHeaderMap(headers: GmailHeader[]): Map<string, string> {
  return headers.reduce((map, header) => {
    map.set(header.name.toLowerCase(), header.value);
    return map;
  }, new Map<string, string>());
}

function parseListUnsubscribeHeader(input: {
  accountId: string;
  remoteMessageId: string;
  listUnsubscribe?: string;
  listUnsubscribePost?: string;
}): LocalMailUnsubscribe | null {
  const entries = extractAngleBracketEntries(input.listUnsubscribe);

  if (entries.length === 0) {
    return null;
  }

  const sourceMessageId = createGoogleMessageLocalId(
    input.accountId,
    input.remoteMessageId
  );
  const oneClick = normalizeOneClickHeader(input.listUnsubscribePost);
  const firstHttpsEntry = entries.find((entry) => isSafeRemoteHttpsUrl(entry));

  if (oneClick && firstHttpsEntry) {
    return {
      method: "http-post",
      endpoint: firstHttpsEntry,
      oneClick: true,
      sourceMessageId
    };
  }

  for (const entry of entries) {
    try {
      const parsed = new URL(entry);

      if (parsed.protocol === "https:" && isSafeRemoteHttpsUrl(parsed.toString())) {
        return {
          method: "http-get",
          endpoint: parsed.toString(),
          oneClick: false,
          sourceMessageId
        };
      }

      if (parsed.protocol === "mailto:") {
        const mailto = parseMailtoTarget(parsed);

        if (!mailto) {
          continue;
        }

        return {
          method: "mailto",
          endpoint: parsed.toString(),
          oneClick: false,
          sourceMessageId,
          mailto
        };
      }
    } catch {
      continue;
    }
  }

  return null;
}

function extractAngleBracketEntries(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  return [...value.matchAll(/<([^>]+)>/g)]
    .map((match) => match[1]?.trim())
    .filter((entry): entry is string => Boolean(entry));
}

function normalizeOneClickHeader(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  return value
    .trim()
    .toLowerCase()
    .split(/[;,]/)
    .some((token) => token.trim() === "list-unsubscribe=one-click");
}

function parseMailtoTarget(url: URL): LocalMailUnsubscribe["mailto"] | null {
  const to = url.pathname
    .split(",")
    .map((entry) => decodeURIComponent(entry).trim().toLowerCase())
    .filter((entry) => entry.includes("@"));

  if (to.length === 0) {
    return null;
  }

  const subject = normalizeOptionalQueryValue(url.searchParams.get("subject"));
  const body = normalizeOptionalQueryValue(url.searchParams.get("body"));

  return {
    to,
    subject,
    body
  };
}

function normalizeOptionalQueryValue(value: string | null): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function parseSentAt(dateHeader: string | undefined, internalDate?: string): number {
  const headerTimestamp = dateHeader ? Date.parse(dateHeader) : Number.NaN;

  if (Number.isFinite(headerTimestamp)) {
    return headerTimestamp;
  }

  const internalTimestamp = Number.parseInt(internalDate ?? "", 10);
  return Number.isFinite(internalTimestamp) ? internalTimestamp : Date.now();
}

function parseAddress(value: string | undefined): ParsedAddress | null {
  return parseAddressList(value)[0] ?? null;
}

function parseAddressList(value: string | undefined): ParsedAddress[] {
  if (!value) {
    return [];
  }

  return splitAddresses(value)
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => {
      const bracketMatch = token.match(/^(.*)<([^>]+)>$/);

      if (bracketMatch) {
        const name = bracketMatch[1]?.replace(/^"|"$/g, "").trim();
        const email = bracketMatch[2]?.trim().toLowerCase();

        if (!email) {
          return null;
        }

        return {
          email,
          name: name || undefined
        };
      }

      const emailOnly = token.replace(/^"|"$/g, "").trim().toLowerCase();

      if (!emailOnly.includes("@")) {
        return null;
      }

      return {
        email: emailOnly
      };
    })
    .filter((address): address is ParsedAddress => address !== null);
}

function splitAddresses(value: string): string[] {
  const parts: string[] = [];
  let current = "";
  let inQuotes = false;

  for (const character of value) {
    if (character === '"') {
      inQuotes = !inQuotes;
      current += character;
      continue;
    }

    if (character === "," && !inQuotes) {
      parts.push(current);
      current = "";
      continue;
    }

    current += character;
  }

  if (current) {
    parts.push(current);
  }

  return parts;
}

function extractPreferredBody(payload: GmailMessagePart | undefined): string {
  if (!payload) {
    return "";
  }

  const plainText = findBodyByMimeType(payload, "text/plain");

  if (plainText) {
    return normalizeBodyText(plainText);
  }

  const html = findBodyByMimeType(payload, "text/html");

  if (html) {
    return normalizeBodyText(stripHtml(html));
  }

  if (payload.body?.data) {
    return normalizeBodyText(decodeBase64Url(payload.body.data));
  }

  return "";
}

function extractAttachments(
  accountId: string,
  remoteMessageId: string,
  payload: GmailMessagePart | undefined
) {
  const attachments: Array<{
    id: string;
    attachmentId?: string;
    filename: string;
    mimeType: string;
    size: number;
    cacheState: "not-cached";
  }> = [];

  visitParts(payload, (part) => {
    if (!part.filename || !part.body?.attachmentId) {
      return;
    }

    attachments.push({
      id: `${createGoogleMessageLocalId(accountId, remoteMessageId)}:attachment:${part.body.attachmentId}`,
      attachmentId: part.body.attachmentId,
      filename: part.filename,
      mimeType: part.mimeType ?? "application/octet-stream",
      size: part.body.size ?? 0,
      cacheState: "not-cached"
    });
  });

  return attachments;
}

function findBodyByMimeType(part: GmailMessagePart, mimeType: string): string | null {
  if (part.mimeType === mimeType && part.body?.data) {
    return decodeBase64Url(part.body.data);
  }

  for (const child of part.parts ?? []) {
    const value = findBodyByMimeType(child, mimeType);

    if (value) {
      return value;
    }
  }

  return null;
}

function visitParts(
  part: GmailMessagePart | undefined,
  visitor: (part: GmailMessagePart) => void
): void {
  if (!part) {
    return;
  }

  visitor(part);

  for (const child of part.parts ?? []) {
    visitParts(child, visitor);
  }
}

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding =
    normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(normalized + padding, "base64").toString("utf8");
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"');
}

function normalizeBodyText(value: string): string {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}
