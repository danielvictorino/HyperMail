import type {
  MailAssistantArtifactRecord,
  MailSplitSuggestion,
  MailThreadSummary,
  MailVoiceExample
} from "@shared/ai/mail-assistant";
import { selectVoiceExamples } from "@shared/ai/mail-assistant";
import type { InboxSplit } from "@shared/mail/models";
import { hypermailDb, type HypermailDatabase } from "../db/hypermail-db";

const SUMMARY_KEY_PREFIX = "assistant:summary:";
const SPLIT_KEY_PREFIX = "assistant:split:";

function getSummaryKey(accountId: string, threadId: string): string {
  return `${SUMMARY_KEY_PREFIX}${accountId}:${threadId}`;
}

function getSplitKey(accountId: string, threadId: string): string {
  return `${SPLIT_KEY_PREFIX}${accountId}:${threadId}`;
}

export async function loadThreadSummaryRecord(
  accountId: string,
  threadId: string,
  database = hypermailDb
): Promise<MailAssistantArtifactRecord<MailThreadSummary> | null> {
  return loadArtifactRecord(getSummaryKey(accountId, threadId), database);
}

export async function saveThreadSummaryRecord(
  accountId: string,
  threadId: string,
  record: MailAssistantArtifactRecord<MailThreadSummary>,
  database = hypermailDb
): Promise<void> {
  await saveArtifactRecord(getSummaryKey(accountId, threadId), record, database);
}

export async function loadSplitSuggestionRecord(
  accountId: string,
  threadId: string,
  database = hypermailDb
): Promise<MailAssistantArtifactRecord<MailSplitSuggestion> | null> {
  return loadArtifactRecord(getSplitKey(accountId, threadId), database);
}

export async function saveSplitSuggestionRecord(
  accountId: string,
  threadId: string,
  record: MailAssistantArtifactRecord<MailSplitSuggestion>,
  database = hypermailDb
): Promise<void> {
  await saveArtifactRecord(getSplitKey(accountId, threadId), record, database);
}

export async function listVoiceExamplesForAccount(
  accountId: string,
  accountEmail: string,
  database = hypermailDb
): Promise<MailVoiceExample[]> {
  const messages = await database.messages
    .where("accountId")
    .equals(accountId)
    .toArray();
  return selectVoiceExamples(messages, accountEmail);
}

export async function applyThreadSplitLocally(
  threadId: string,
  split: InboxSplit,
  database = hypermailDb
): Promise<void> {
  const thread = await database.threads.get(threadId);

  if (!thread) {
    return;
  }

  await database.threads.put({
    ...thread,
    split,
    updatedAt: Date.now()
  });
}

async function loadArtifactRecord<TRecord>(
  key: string,
  database: HypermailDatabase
): Promise<TRecord | null> {
  const record = await database.metadata.get(key);

  if (!record) {
    return null;
  }

  try {
    return JSON.parse(record.value) as TRecord;
  } catch {
    return null;
  }
}

async function saveArtifactRecord<TRecord>(
  key: string,
  record: TRecord,
  database: HypermailDatabase
): Promise<void> {
  await database.metadata.put({
    key,
    value: JSON.stringify(record),
    updatedAt: Date.now()
  });
}
