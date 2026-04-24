import type { InboxSplit, LocalMailMessage, ThreadProjection } from "../mail/models";

export const DEFAULT_OPENAI_MODEL = "gpt-5.4-mini";
export const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-20250514";
export const DEFAULT_OLLAMA_MODEL = "llama3.2";
export const DEFAULT_OLLAMA_BASE_URL = "http://127.0.0.1:11434";
export const MAX_VOICE_EXAMPLES = 4;

export const MAIL_ASSISTANT_PROVIDERS = ["openai", "anthropic", "ollama"] as const;
export const MAIL_ASSISTANT_MODEL_PRESETS = [
  "balanced",
  "quality",
  "fast",
  "cheap"
] as const;

export type MailAssistantProvider = (typeof MAIL_ASSISTANT_PROVIDERS)[number];
export type MailAssistantModelPresetId = (typeof MAIL_ASSISTANT_MODEL_PRESETS)[number];
export type MailAssistantConfidence = "low" | "medium" | "high";

export interface MailAssistantProviderConfig {
  model: string;
  presetId: MailAssistantModelPresetId | null;
  temperature: number | null;
  maxOutputTokens: number | null;
  baseUrl: string | null;
}

export interface MailAssistantProviderInputConfig extends MailAssistantProviderConfig {
  apiKey?: string;
  clearApiKey?: boolean;
}

export interface MailAssistantSettings {
  primaryProvider: MailAssistantProvider;
  fallbackProvider: MailAssistantProvider | null;
  providers: Record<MailAssistantProvider, MailAssistantProviderConfig>;
}

export interface MailAssistantSettingsSeed {
  primaryProvider?: MailAssistantProvider;
  fallbackProvider?: MailAssistantProvider | null;
  providers?: Partial<
    Record<MailAssistantProvider, Partial<MailAssistantProviderConfig>>
  >;
}

export interface MailAssistantSettingsInput {
  primaryProvider: MailAssistantProvider;
  fallbackProvider: MailAssistantProvider | null;
  providers: Record<MailAssistantProvider, MailAssistantProviderInputConfig>;
}

export interface MailAssistantProviderStatus {
  provider: MailAssistantProvider;
  label: string;
  available: boolean;
  hasSecret: boolean;
  reason?: string;
}

export interface MailAssistantRuntimeConfig {
  enabled: boolean;
  provider: MailAssistantProvider;
  model: string;
  fallbackProvider: MailAssistantProvider | null;
  fallbackModel: string | null;
  activeProvider: MailAssistantProvider | null;
  activeModel: string | null;
  reason?: string;
  settings: MailAssistantSettings;
  providerStatuses: Record<MailAssistantProvider, MailAssistantProviderStatus>;
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
  fallbackUsed: boolean;
  data: TData;
}

export interface MailAssistantPresetDefaults {
  temperature: number | null;
  maxOutputTokens: number | null;
}

export interface OllamaModelListResult {
  baseUrl: string;
  models: string[];
}

export interface MailAssistantProviderConnectionResult {
  provider: MailAssistantProvider;
  ok: boolean;
  message: string;
  model: string;
  baseUrl?: string | null;
}

export const OPENAI_MODEL_SUGGESTIONS = [
  DEFAULT_OPENAI_MODEL,
  "gpt-5.4",
  "gpt-4.1-mini"
] as const;

export const ANTHROPIC_MODEL_SUGGESTIONS = [
  DEFAULT_ANTHROPIC_MODEL,
  "claude-opus-4-1-20250805",
  "claude-haiku-3-5-20241022"
] as const;

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

export function getProviderLabel(provider: MailAssistantProvider): string {
  switch (provider) {
    case "openai":
      return "OpenAI";
    case "anthropic":
      return "Anthropic";
    case "ollama":
      return "Ollama";
    default:
      return provider;
  }
}

export function providerUsesApiKey(
  provider: MailAssistantProvider
): provider is Extract<MailAssistantProvider, "openai" | "anthropic"> {
  return provider === "openai" || provider === "anthropic";
}

export function getDefaultMailAssistantProviderConfig(
  provider: MailAssistantProvider
): MailAssistantProviderConfig {
  switch (provider) {
    case "openai":
      return {
        model: DEFAULT_OPENAI_MODEL,
        presetId: "balanced",
        temperature: null,
        maxOutputTokens: null,
        baseUrl: null
      };
    case "anthropic":
      return {
        model: DEFAULT_ANTHROPIC_MODEL,
        presetId: "balanced",
        temperature: null,
        maxOutputTokens: null,
        baseUrl: null
      };
    case "ollama":
      return {
        model: DEFAULT_OLLAMA_MODEL,
        presetId: "balanced",
        temperature: null,
        maxOutputTokens: null,
        baseUrl: DEFAULT_OLLAMA_BASE_URL
      };
    default:
      return {
        model: "",
        presetId: "balanced",
        temperature: null,
        maxOutputTokens: null,
        baseUrl: null
      };
  }
}

export function createDefaultMailAssistantSettings(): MailAssistantSettings {
  return {
    primaryProvider: "openai",
    fallbackProvider: "anthropic",
    providers: {
      openai: getDefaultMailAssistantProviderConfig("openai"),
      anthropic: getDefaultMailAssistantProviderConfig("anthropic"),
      ollama: getDefaultMailAssistantProviderConfig("ollama")
    }
  };
}

export function createDefaultMailAssistantSettingsInput(): MailAssistantSettingsInput {
  const defaults = createDefaultMailAssistantSettings();

  return {
    primaryProvider: defaults.primaryProvider,
    fallbackProvider: defaults.fallbackProvider,
    providers: {
      openai: { ...defaults.providers.openai },
      anthropic: { ...defaults.providers.anthropic },
      ollama: { ...defaults.providers.ollama }
    }
  };
}

export function mergeMailAssistantSettings(
  ...sources: Array<MailAssistantSettingsSeed | null | undefined>
): MailAssistantSettings {
  const merged = createDefaultMailAssistantSettings();

  for (const source of sources) {
    if (!source) {
      continue;
    }

    if (source.primaryProvider && isMailAssistantProvider(source.primaryProvider)) {
      merged.primaryProvider = source.primaryProvider;
    }

    if (
      source.fallbackProvider === null ||
      (source.fallbackProvider && isMailAssistantProvider(source.fallbackProvider))
    ) {
      merged.fallbackProvider = source.fallbackProvider ?? null;
    }

    if (!source.providers) {
      continue;
    }

    for (const provider of MAIL_ASSISTANT_PROVIDERS) {
      const incoming = source.providers[provider];

      if (!incoming) {
        continue;
      }

      merged.providers[provider] = normalizeMailAssistantProviderConfig(
        provider,
        incoming
      );
    }
  }

  if (merged.fallbackProvider === merged.primaryProvider) {
    merged.fallbackProvider = null;
  }

  return merged;
}

export function normalizeMailAssistantProviderConfig(
  provider: MailAssistantProvider,
  config:
    | Partial<MailAssistantProviderConfig>
    | Partial<MailAssistantProviderInputConfig>
): MailAssistantProviderConfig {
  const defaults = getDefaultMailAssistantProviderConfig(provider);
  const model = config.model?.trim();
  const baseUrl = config.baseUrl?.trim();

  return {
    model: model && model.length > 0 ? model : defaults.model,
    presetId: config.presetId ?? defaults.presetId,
    temperature:
      typeof config.temperature === "number"
        ? config.temperature
        : defaults.temperature,
    maxOutputTokens:
      typeof config.maxOutputTokens === "number"
        ? config.maxOutputTokens
        : defaults.maxOutputTokens,
    baseUrl:
      provider === "ollama"
        ? baseUrl && baseUrl.length > 0
          ? normalizeOllamaBaseUrl(baseUrl)
          : defaults.baseUrl
        : null
  };
}

export function sanitizeMailAssistantSettingsInput(
  input: MailAssistantSettingsInput
): MailAssistantSettings {
  return mergeMailAssistantSettings({
    primaryProvider: input.primaryProvider,
    fallbackProvider: input.fallbackProvider,
    providers: {
      openai: normalizeMailAssistantProviderConfig("openai", input.providers.openai),
      anthropic: normalizeMailAssistantProviderConfig(
        "anthropic",
        input.providers.anthropic
      ),
      ollama: normalizeMailAssistantProviderConfig("ollama", input.providers.ollama)
    }
  });
}

export function getMailAssistantPresetDefaults(
  provider: MailAssistantProvider,
  presetId: MailAssistantModelPresetId | null
): MailAssistantPresetDefaults {
  switch (presetId) {
    case "quality":
      return {
        temperature: provider === "ollama" ? 0.2 : 0.35,
        maxOutputTokens: null
      };
    case "fast":
      return {
        temperature: 0.1,
        maxOutputTokens: 450
      };
    case "cheap":
      return {
        temperature: 0.05,
        maxOutputTokens: 320
      };
    case "balanced":
    default:
      return {
        temperature: 0.2,
        maxOutputTokens: null
      };
  }
}

export function resolveMailAssistantTemperature(
  provider: MailAssistantProvider,
  config: MailAssistantProviderConfig
): number | null {
  if (typeof config.temperature === "number") {
    return config.temperature;
  }

  return getMailAssistantPresetDefaults(provider, config.presetId).temperature;
}

export function resolveMailAssistantMaxOutputTokens(
  provider: MailAssistantProvider,
  config: MailAssistantProviderConfig,
  fallbackValue: number
): number {
  if (typeof config.maxOutputTokens === "number") {
    return config.maxOutputTokens;
  }

  return (
    getMailAssistantPresetDefaults(provider, config.presetId).maxOutputTokens ??
    fallbackValue
  );
}

export function normalizeOllamaBaseUrl(baseUrl: string): string {
  const parsed = new URL(baseUrl);
  const normalizedPath = parsed.pathname.replace(/\/+$/, "");

  parsed.pathname = normalizedPath.length > 0 ? normalizedPath : "";
  parsed.hash = "";
  parsed.search = "";

  return parsed.toString().replace(/\/$/, "");
}

export function getOllamaTagsUrl(baseUrl: string): string {
  return `${normalizeOllamaBaseUrl(baseUrl)}/api/tags`;
}

export function getOllamaChatUrl(baseUrl: string): string {
  return `${normalizeOllamaBaseUrl(baseUrl)}/api/chat`;
}

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

export function buildThreadSummaryInput(thread: MailAssistantThreadContext): string {
  return [
    "Summarize the following email thread for fast triage.",
    formatThreadContext(thread)
  ].join("\n\n");
}

export function buildSplitSuggestionInstructions(): string {
  return [
    "You classify threads for a priority-split inbox.",
    "Use vip for high-leverage humans, decision makers, close collaborators, or relationships the user should never miss.",
    "Use important for threads that likely need a timely response or careful follow-up.",
    "Use other for ambient updates, low-urgency operational chatter, and non-critical threads.",
    "Use only facts from the thread. Do not infer company hierarchy unless the thread strongly supports it.",
    "Always return JSON that matches the supplied schema."
  ].join("\n");
}

export function buildSplitSuggestionInput(thread: MailAssistantThreadContext): string {
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

export function renderDraftSuggestionHtml(suggestion: MailDraftSuggestion): string {
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

function isMailAssistantProvider(value: string): value is MailAssistantProvider {
  return (MAIL_ASSISTANT_PROVIDERS as readonly string[]).includes(value);
}
