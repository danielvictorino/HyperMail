import type { InboxSplit, LocalMailMessage, ThreadProjection } from "../mail/models";

export const DEFAULT_OPENAI_MODEL = "gpt-5.4-mini";
export const MAX_VOICE_EXAMPLES = 4;

export type MailAssistantProvider = "openai";
export type MailAssistantConfidence = "low" | "medium" | "high";

export interface MailAssistantRuntimeConfig {
  enabled: boolean;
  provider: MailAssistantProvider;
  model: string;
  reason?: string;
}

export interface MailAssistantThreadMessage {
  id: string;
  fromName: string;
  fromEmail: string;
  subject: string;
  bodyPlain: string;
  sentAt: number;
}

export interface MailAssistantThreadContext {
  accountId: string;
  accountEmail: string;
  threadId: string;
  subject: string;
  snippet: string;
  split: InboxSplit;
  participantNames: string[];
  participantEmails: string[];
  messages: MailAssistantThreadMessage[];
}

export interface MailVoiceExample {
  id: string;
  subject: string;
  to: string[];
  bodyPlain: string;
  sentAt: number;
}

export interface MailThreadSummary {
  headline: string;
  bullets: string[];
  actionItems: string[];
  replyRecommendation: string;
}

export interface MailSplitSuggestion {
  split: InboxSplit;
  confidence: MailAssistantConfidence;
  rationale: string;
  triggerKeywords: string[];
}

export interface MailDraftSuggestion {
  subject: string;
  preview: string;
  greeting: string;
  paragraphs: string[];
  closing: string;
  signoff: string;
  tone: string;
}

export interface MailAssistantArtifactRecord<TData> {
  provider: MailAssistantProvider;
  model: string;
  generatedAt: number;
  data: TData;
}

export const MAIL_THREAD_SUMMARY_SCHEMA = {
  type: "json_schema",
  name: "hypermail_thread_summary",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      headline: { type: "string" },
      bullets: {
        type: "array",
        items: { type: "string" },
        minItems: 2,
        maxItems: 4
      },
      actionItems: {
        type: "array",
        items: { type: "string" },
        maxItems: 4
      },
      replyRecommendation: { type: "string" }
    },
    required: ["headline", "bullets", "actionItems", "replyRecommendation"]
  }
} as const;

export const MAIL_SPLIT_SUGGESTION_SCHEMA = {
  type: "json_schema",
  name: "hypermail_split_suggestion",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      split: {
        type: "string",
        enum: ["important", "vip", "other"]
      },
      confidence: {
        type: "string",
        enum: ["low", "medium", "high"]
      },
      rationale: { type: "string" },
      triggerKeywords: {
        type: "array",
        items: { type: "string" },
        maxItems: 4
      }
    },
    required: ["split", "confidence", "rationale", "triggerKeywords"]
  }
} as const;

export const MAIL_DRAFT_SUGGESTION_SCHEMA = {
  type: "json_schema",
  name: "hypermail_draft_suggestion",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      subject: { type: "string" },
      preview: { type: "string" },
      greeting: { type: "string" },
      paragraphs: {
        type: "array",
        items: { type: "string" },
        minItems: 1,
        maxItems: 4
      },
      closing: { type: "string" },
      signoff: { type: "string" },
      tone: { type: "string" }
    },
    required: [
      "subject",
      "preview",
      "greeting",
      "paragraphs",
      "closing",
      "signoff",
      "tone"
    ]
  }
} as const;

export function buildAssistantThreadContext(
  thread: ThreadProjection,
  accountEmail: string
): MailAssistantThreadContext {
  return {
    accountId: thread.thread.accountId,
    accountEmail,
    threadId: thread.thread.id,
    subject: thread.thread.subject,
    snippet: compactText(thread.thread.snippet, 220),
    split: thread.thread.split,
    participantNames: [...thread.thread.participantNames],
    participantEmails: [...thread.thread.participantEmails],
    messages: thread.messages.map((message) => ({
      id: message.id,
      fromName: message.fromName,
      fromEmail: message.fromEmail,
      subject: compactText(message.subject, 180),
      bodyPlain: compactText(message.bodyPlain, 1_100),
      sentAt: message.sentAt
    }))
  };
}

export function selectVoiceExamples(
  messages: LocalMailMessage[],
  accountEmail: string,
  limit = MAX_VOICE_EXAMPLES
): MailVoiceExample[] {
  const normalizedAccountEmail = accountEmail.toLowerCase();
  const selected: MailVoiceExample[] = [];
  const seenBodies = new Set<string>();

  const candidates = [...messages]
    .filter((message) => {
      if (message.fromEmail.toLowerCase() !== normalizedAccountEmail) {
        return false;
      }

      if (
        message.deliveryState === "queued" ||
        message.deliveryState === "sending" ||
        message.deliveryState === "failed"
      ) {
        return false;
      }

      return compactText(message.bodyPlain, 400).length >= 24;
    })
    .sort((left, right) => right.sentAt - left.sentAt);

  for (const message of candidates) {
    if (selected.length >= limit) {
      break;
    }

    const signature = compactText(message.bodyPlain, 120).toLowerCase();

    if (seenBodies.has(signature)) {
      continue;
    }

    seenBodies.add(signature);
    selected.push({
      id: message.id,
      subject: compactText(message.subject, 160),
      to: [...message.to],
      bodyPlain: compactText(message.bodyPlain, 420),
      sentAt: message.sentAt
    });
  }

  return selected;
}

export function createReplySignature(displayName: string): string {
  const trimmed = displayName.trim();

  if (!trimmed) {
    return "HyperMail";
  }

  return trimmed.split(/\s+/)[0] ?? trimmed;
}

export function buildThreadSummaryInstructions(): string {
  return [
    "You are HyperMail, an elite email triage copilot inside a keyboard-first desktop client.",
    "Summaries must help the user understand a thread in under five seconds.",
    "Be terse, factual, and specific to the thread.",
    "Do not invent decisions, dates, or commitments that are not present in the messages.",
    "If the thread does not contain explicit action items, return an empty actionItems array.",
    "Always return JSON that matches the supplied schema."
  ].join("\n");
}

export function buildThreadSummaryInput(
  thread: MailAssistantThreadContext
): string {
  return [
    "Summarize the following email thread for fast triage.",
    formatThreadContext(thread)
  ].join("\n\n");
}

export function buildSplitSuggestionInstructions(): string {
  return [
    "You classify threads for a Superhuman-style split inbox.",
    "Use vip for high-leverage humans, decision makers, close collaborators, or relationships the user should never miss.",
    "Use important for threads that likely need a timely response or careful follow-up.",
    "Use other for ambient updates, low-urgency operational chatter, and non-critical threads.",
    "Use only facts from the thread. Do not infer company hierarchy unless the thread strongly supports it.",
    "Always return JSON that matches the supplied schema."
  ].join("\n");
}

export function buildSplitSuggestionInput(
  thread: MailAssistantThreadContext
): string {
  return [
    "Classify the following thread into the best split inbox bucket.",
    formatThreadContext(thread)
  ].join("\n\n");
}

export function buildDraftReplyInstructions(): string {
  return [
    "You write replies for HyperMail users.",
    "Match the cadence, sentence length, directness, and closing style of the provided voice examples without copying them verbatim.",
    "Keep the draft concise, warm, and professional.",
    "Do not use em dashes.",
    "Do not invent commitments, dates, pricing, or details that are not present in the thread.",
    "If the right reply is brief, keep it brief.",
    "Always return JSON that matches the supplied schema."
  ].join("\n");
}

export function buildDraftReplyInput(input: {
  thread: MailAssistantThreadContext;
  voiceExamples: MailVoiceExample[];
  accountName: string;
  signature: string;
}): string {
  const voiceExamplesBlock =
    input.voiceExamples.length === 0
      ? "No sent-mail examples are available yet. Stay concise and professional."
      : input.voiceExamples
          .map((example, index) =>
            [
              `Example ${index + 1}`,
              `Subject: ${example.subject}`,
              `To: ${example.to.join(", ") || "unknown"}`,
              `Body: ${example.bodyPlain}`
            ].join("\n")
          )
          .join("\n\n");

  return [
    `Draft a reply in ${input.accountName}'s voice.`,
    `Preferred signoff: ${input.signature}`,
    "Current thread:",
    formatThreadContext(input.thread),
    "Sent-mail voice examples:",
    voiceExamplesBlock
  ].join("\n\n");
}

export function renderDraftSuggestionHtml(
  suggestion: MailDraftSuggestion
): string {
  const blocks = [
    suggestion.greeting,
    ...suggestion.paragraphs,
    [suggestion.closing, suggestion.signoff].filter(Boolean).join("\n")
  ].filter((block) => block.trim().length > 0);

  return blocks
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br />")}</p>`)
    .join("");
}

function formatThreadContext(thread: MailAssistantThreadContext): string {
  return [
    `Subject: ${thread.subject}`,
    `Current split: ${thread.split}`,
    `Participants: ${thread.participantNames.join(", ")}`,
    `Snippet: ${thread.snippet}`,
    "Messages:",
    ...thread.messages.map((message, index) =>
      [
        `${index + 1}. ${message.fromName} <${message.fromEmail}>`,
        `Sent: ${new Date(message.sentAt).toISOString()}`,
        `Subject: ${message.subject}`,
        `Body: ${message.bodyPlain}`
      ].join("\n")
    )
  ].join("\n\n");
}

function compactText(value: string, maxLength: number): string {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
