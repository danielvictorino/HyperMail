import { z } from "zod";
import {
  MAIL_ASSISTANT_MODEL_PRESETS,
  MAIL_ASSISTANT_PROVIDERS
} from "./ai/mail-assistant";

const nonEmptyString = z.string().trim().min(1).max(512);
const idString = z.string().trim().min(1).max(256);
const emailString = z.string().trim().email().max(320);
const safeHttpsUrl = z
  .string()
  .trim()
  .max(2048)
  .refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === "https:" || url.protocol === "mailto:";
    } catch {
      return false;
    }
  }, "Only https and mailto URLs are allowed");
const safeHttpUrl = z
  .string()
  .trim()
  .max(2048)
  .refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }, "Only http and https URLs are allowed");

export const gmailMailboxSyncRequestSchema = z.object({
  accountId: idString,
  historyId: z.string().trim().min(1).max(128).nullable().optional(),
  maxResults: z.number().int().positive().max(500).optional()
});

export const setThreadStarredRequestSchema = z.object({
  accountId: idString,
  threadId: idString,
  starred: z.boolean(),
  idempotencyKey: idString
});

export const setThreadArchivedRequestSchema = z.object({
  accountId: idString,
  threadId: idString,
  archived: z.boolean(),
  idempotencyKey: idString
});

const localMailUnsubscribeSchema = z.object({
  method: z.enum(["mailto", "http-get", "http-post"]),
  endpoint: safeHttpsUrl,
  oneClick: z.boolean(),
  sourceMessageId: idString,
  mailto: z
    .object({
      to: z.array(emailString).min(1).max(20),
      subject: z.string().max(1024).optional(),
      body: z.string().max(8192).optional()
    })
    .optional()
});

export const unsubscribeThreadRequestSchema = z.object({
  accountId: idString,
  threadId: idString,
  unsubscribe: localMailUnsubscribeSchema,
  idempotencyKey: idString
});

export const downloadGmailAttachmentRequestSchema = z.object({
  accountId: idString,
  threadId: idString,
  messageId: idString,
  attachmentId: idString,
  filename: nonEmptyString,
  mimeType: nonEmptyString,
  size: z
    .number()
    .int()
    .nonnegative()
    .max(100 * 1024 * 1024)
});

export const cachedAttachmentPayloadSchema = z.object({
  id: idString,
  accountId: idString,
  threadId: idString,
  messageId: idString,
  attachmentId: idString,
  filename: nonEmptyString,
  mimeType: nonEmptyString,
  size: z
    .number()
    .int()
    .nonnegative()
    .max(100 * 1024 * 1024),
  contentBase64: z.string().max(200 * 1024 * 1024),
  downloadedAt: z.number().int().nonnegative()
});

export const sendDraftRequestSchema = z.object({
  accountId: idString,
  draftId: idString,
  threadId: idString,
  clientMessageId: idString,
  to: z.array(emailString).min(1).max(100),
  cc: z.array(emailString).max(100),
  bcc: z.array(emailString).max(100),
  subject: z.string().max(2048),
  bodyHtml: z.string().max(5 * 1024 * 1024),
  replyToMessageId: idString.optional(),
  sendAt: z.number().int().nonnegative().nullable().optional()
});

const mailAssistantThreadContextSchema = z
  .object({})
  .passthrough()
  .refine(
    (value) => JSON.stringify(value).length <= 512 * 1024,
    "Thread context exceeds 512KB"
  );

export const summarizeThreadRequestSchema = z.object({
  thread: mailAssistantThreadContextSchema
});

export const suggestSplitRequestSchema = z.object({
  thread: mailAssistantThreadContextSchema
});

export const generateDraftReplyRequestSchema = z.object({
  thread: mailAssistantThreadContextSchema,
  voiceExamples: z.array(z.object({}).passthrough()).max(50),
  accountName: z.string().max(256),
  signature: z.string().max(4096)
});

const mailAssistantProviderSchema = z.enum(MAIL_ASSISTANT_PROVIDERS);
const mailAssistantPresetSchema = z.enum(MAIL_ASSISTANT_MODEL_PRESETS);
const assistantProviderInputConfigSchema = z.object({
  model: z.string().trim().max(256),
  presetId: mailAssistantPresetSchema.nullable(),
  temperature: z.number().min(0).max(2).nullable(),
  maxOutputTokens: z.number().int().positive().max(65_536).nullable(),
  baseUrl: z.union([safeHttpUrl, z.null()]).default(null),
  apiKey: z.string().max(4096).optional(),
  clearApiKey: z.boolean().optional()
});

export const mailAssistantSettingsInputSchema = z
  .object({
    primaryProvider: mailAssistantProviderSchema,
    fallbackProvider: mailAssistantProviderSchema.nullable(),
    providers: z
      .object({
        openai: assistantProviderInputConfigSchema,
        anthropic: assistantProviderInputConfigSchema,
        ollama: assistantProviderInputConfigSchema
      })
      .strict()
  })
  .refine(
    (value) =>
      value.fallbackProvider === null ||
      value.fallbackProvider !== value.primaryProvider,
    "Fallback provider must be different from the primary provider."
  );

export const saveMailAssistantSettingsRequestSchema = z.object({
  settings: mailAssistantSettingsInputSchema
});

export const testMailAssistantProviderConnectionRequestSchema = z.object({
  provider: mailAssistantProviderSchema,
  settings: mailAssistantSettingsInputSchema
});

export const listOllamaModelsRequestSchema = z.object({
  baseUrl: safeHttpUrl.nullable().optional()
});

export const rendererErrorPayloadSchema = z.object({
  kind: z.enum(["error", "unhandledrejection"]),
  message: z.string().max(8192),
  stack: z.string().max(32768).optional(),
  source: z.string().max(2048).optional(),
  line: z.number().int().nonnegative().optional(),
  column: z.number().int().nonnegative().optional()
});

export type IpcSchema = z.ZodTypeAny;

export class IpcValidationError extends Error {
  constructor(
    public readonly channel: string,
    public readonly issues: z.ZodIssue[]
  ) {
    super(
      `IPC payload rejected on channel "${channel}": ${issues
        .map((issue) => `${issue.path.join(".") || "<root>"} ${issue.message}`)
        .join("; ")}`
    );
    this.name = "IpcValidationError";
  }
}

export function parseIpcPayload<TSchema extends IpcSchema>(
  channel: string,
  schema: TSchema,
  input: unknown
): z.infer<TSchema> {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new IpcValidationError(channel, result.error.issues);
  }
  return result.data;
}

export const EXTERNAL_URL_PROTOCOL_ALLOWLIST = new Set(["https:", "mailto:"]);

export function isAllowedExternalUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    return EXTERNAL_URL_PROTOCOL_ALLOWLIST.has(parsed.protocol);
  } catch {
    return false;
  }
}
