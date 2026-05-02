import type { ThreadProjection } from "@shared/mail/models";

const whitespacePattern = /\s+/g;

interface MailboxSearchEntry {
  thread: ThreadProjection;
  subject: string;
  participants: string;
  snippet: string;
  messageBodies: string;
  lastMessageAt: number;
  unread: boolean;
}

export interface MailboxSearchIndex {
  threads: ThreadProjection[];
  entries: MailboxSearchEntry[];
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(whitespacePattern, " ");
}

function tokenize(value: string): string[] {
  return value
    .split(" ")
    .map((token) => token.trim())
    .filter(Boolean);
}

function countMatches(haystack: string, token: string): number {
  if (!haystack || !token) {
    return 0;
  }

  let count = 0;
  let index = haystack.indexOf(token);

  while (index >= 0) {
    count += 1;
    index = haystack.indexOf(token, index + token.length);
  }

  return count;
}

function createMailboxSearchEntry(thread: ThreadProjection): MailboxSearchEntry {
  return {
    thread,
    subject: normalize(thread.thread.subject),
    participants: normalize(
      [...thread.thread.participantNames, ...thread.thread.participantEmails].join(" ")
    ),
    snippet: normalize(thread.thread.snippet),
    messageBodies: normalize(
      thread.messages.map((message) => message.bodyPlain).join(" ")
    ),
    lastMessageAt: thread.thread.lastMessageAt,
    unread: thread.thread.unread
  };
}

function scoreThreadEntry(
  entry: MailboxSearchEntry,
  normalizedQuery: string,
  tokens: string[]
): number {
  if (tokens.length === 0) {
    return 0;
  }

  let score = 0;

  if (entry.subject.startsWith(normalizedQuery)) {
    score += 220;
  }

  if (entry.participants.startsWith(normalizedQuery)) {
    score += 180;
  }

  if (entry.subject.includes(normalizedQuery)) {
    score += 120;
  }

  if (entry.participants.includes(normalizedQuery)) {
    score += 90;
  }

  if (entry.snippet.includes(normalizedQuery)) {
    score += 70;
  }

  if (entry.messageBodies.includes(normalizedQuery)) {
    score += 60;
  }

  for (const token of tokens) {
    const subjectMatches = countMatches(entry.subject, token);
    const participantMatches = countMatches(entry.participants, token);
    const snippetMatches = countMatches(entry.snippet, token);
    const bodyMatches = countMatches(entry.messageBodies, token);
    const tokenMatched =
      subjectMatches + participantMatches + snippetMatches + bodyMatches > 0;

    if (!tokenMatched) {
      return 0;
    }

    score += subjectMatches * 45;
    score += participantMatches * 38;
    score += snippetMatches * 24;
    score += Math.min(bodyMatches, 3) * 12;
  }

  if (entry.unread) {
    score += 6;
  }

  return score;
}

export function createMailboxSearchIndex(
  threads: ThreadProjection[]
): MailboxSearchIndex {
  return {
    threads,
    entries: threads.map(createMailboxSearchEntry)
  };
}

export function searchThreads(
  source: ThreadProjection[] | MailboxSearchIndex,
  query: string
): ThreadProjection[] {
  const index = Array.isArray(source) ? createMailboxSearchIndex(source) : source;
  const normalizedQuery = normalize(query);

  if (!normalizedQuery) {
    return index.threads;
  }

  const tokens = tokenize(normalizedQuery);
  const matches: Array<{
    thread: ThreadProjection;
    score: number;
    lastMessageAt: number;
  }> = [];

  for (const entry of index.entries) {
    const score = scoreThreadEntry(entry, normalizedQuery, tokens);

    if (score <= 0) {
      continue;
    }

    matches.push({
      thread: entry.thread,
      score,
      lastMessageAt: entry.lastMessageAt
    });
  }

  return matches
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return right.lastMessageAt - left.lastMessageAt;
    })
    .map((entry) => entry.thread);
}
