import type { ThreadProjection } from "@shared/mail/models";

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function tokenize(value: string): string[] {
  return normalize(value)
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

function scoreThread(thread: ThreadProjection, normalizedQuery: string): number {
  const subject = normalize(thread.thread.subject);
  const participants = normalize(
    [...thread.thread.participantNames, ...thread.thread.participantEmails].join(" ")
  );
  const snippet = normalize(thread.thread.snippet);
  const messageBodies = normalize(
    thread.messages.map((message) => message.bodyPlain).join(" ")
  );
  const tokens = tokenize(normalizedQuery);

  if (tokens.length === 0) {
    return 0;
  }

  let score = 0;

  if (subject.startsWith(normalizedQuery)) {
    score += 220;
  }

  if (participants.startsWith(normalizedQuery)) {
    score += 180;
  }

  if (subject.includes(normalizedQuery)) {
    score += 120;
  }

  if (participants.includes(normalizedQuery)) {
    score += 90;
  }

  if (snippet.includes(normalizedQuery)) {
    score += 70;
  }

  if (messageBodies.includes(normalizedQuery)) {
    score += 60;
  }

  for (const token of tokens) {
    const subjectMatches = countMatches(subject, token);
    const participantMatches = countMatches(participants, token);
    const snippetMatches = countMatches(snippet, token);
    const bodyMatches = countMatches(messageBodies, token);
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

  if (thread.thread.unread) {
    score += 6;
  }

  return score;
}

export function searchThreads(
  threads: ThreadProjection[],
  query: string
): ThreadProjection[] {
  const normalizedQuery = normalize(query);

  if (!normalizedQuery) {
    return threads;
  }

  return threads
    .map((thread) => ({
      thread,
      score: scoreThread(thread, normalizedQuery)
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return right.thread.thread.lastMessageAt - left.thread.thread.lastMessageAt;
    })
    .map((entry) => entry.thread);
}
