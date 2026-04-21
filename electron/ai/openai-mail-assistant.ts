import type {
  GenerateDraftReplyRequest,
  GenerateDraftReplyResult,
  SuggestSplitRequest,
  SuggestSplitResult,
  SummarizeThreadRequest,
  SummarizeThreadResult
} from "../../src/shared/contracts";
import {
  buildDraftReplyInput,
  buildDraftReplyInstructions,
  buildSplitSuggestionInput,
  buildSplitSuggestionInstructions,
  buildThreadSummaryInput,
  buildThreadSummaryInstructions,
  DEFAULT_OPENAI_MODEL,
  MAIL_DRAFT_SUGGESTION_SCHEMA,
  MAIL_SPLIT_SUGGESTION_SCHEMA,
  MAIL_THREAD_SUMMARY_SCHEMA,
  type MailAssistantRuntimeConfig,
  type MailDraftSuggestion,
  type MailSplitSuggestion,
  type MailThreadSummary
} from "../../src/shared/ai/mail-assistant";
import { getRuntimeConfigSummary } from "../runtime/runtime-config";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

interface OpenAiResponsePayload {
  error?: {
    message?: string;
  };
  output_text?: string;
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
      refusal?: string;
    }>;
  }>;
}

export function getMailAssistantRuntimeConfig(): MailAssistantRuntimeConfig {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    const runtimeConfig = getRuntimeConfigSummary();

    return {
      enabled: false,
      provider: "openai",
      model: process.env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL,
      reason: `Add OPENAI_API_KEY to ${runtimeConfig.preferredConfigPath} to enable AI drafting and summaries.`
    };
  }

  return {
    enabled: true,
    provider: "openai",
    model: process.env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL
  };
}

export async function summarizeThread(
  input: SummarizeThreadRequest
): Promise<SummarizeThreadResult> {
  const config = getEnabledRuntimeConfig();
  const summary = await requestStructuredResponse<MailThreadSummary>({
    config,
    instructions: buildThreadSummaryInstructions(),
    input: buildThreadSummaryInput(input.thread),
    format: MAIL_THREAD_SUMMARY_SCHEMA,
    maxOutputTokens: 500
  });

  return {
    summary,
    provider: config.provider,
    model: config.model,
    generatedAt: Date.now()
  };
}

export async function suggestSplit(
  input: SuggestSplitRequest
): Promise<SuggestSplitResult> {
  const config = getEnabledRuntimeConfig();
  const suggestion = await requestStructuredResponse<MailSplitSuggestion>({
    config,
    instructions: buildSplitSuggestionInstructions(),
    input: buildSplitSuggestionInput(input.thread),
    format: MAIL_SPLIT_SUGGESTION_SCHEMA,
    maxOutputTokens: 350
  });

  return {
    suggestion,
    provider: config.provider,
    model: config.model,
    generatedAt: Date.now()
  };
}

export async function generateDraftReply(
  input: GenerateDraftReplyRequest
): Promise<GenerateDraftReplyResult> {
  const config = getEnabledRuntimeConfig();
  const draft = await requestStructuredResponse<MailDraftSuggestion>({
    config,
    instructions: buildDraftReplyInstructions(),
    input: buildDraftReplyInput({
      thread: input.thread,
      voiceExamples: input.voiceExamples,
      accountName: input.accountName,
      signature: input.signature
    }),
    format: MAIL_DRAFT_SUGGESTION_SCHEMA,
    maxOutputTokens: 700
  });

  return {
    draft,
    provider: config.provider,
    model: config.model,
    generatedAt: Date.now()
  };
}

function getEnabledRuntimeConfig(): MailAssistantRuntimeConfig {
  const config = getMailAssistantRuntimeConfig();

  if (!config.enabled) {
    throw new Error(config.reason ?? "AI assistance is not configured.");
  }

  return config;
}

async function requestStructuredResponse<TResult>(options: {
  config: MailAssistantRuntimeConfig;
  instructions: string;
  input: string;
  format: object;
  maxOutputTokens: number;
}): Promise<TResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error(
      `OPENAI_API_KEY is missing. Add it to ${getRuntimeConfigSummary().preferredConfigPath}.`
    );
  }

  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: options.config.model,
      instructions: options.instructions,
      input: [
        {
          role: "user",
          content: options.input
        }
      ],
      max_output_tokens: options.maxOutputTokens,
      text: {
        format: options.format
      }
    })
  });

  const payload = (await response.json()) as OpenAiResponsePayload;

  if (!response.ok) {
    throw new Error(
      payload.error?.message ?? "OpenAI did not return a successful response."
    );
  }

  const responseText = extractStructuredOutput(payload);

  try {
    return JSON.parse(responseText) as TResult;
  } catch {
    throw new Error("OpenAI returned malformed structured output.");
  }
}

function extractStructuredOutput(payload: OpenAiResponsePayload): string {
  if (payload.output_text?.trim()) {
    return payload.output_text;
  }

  for (const item of payload.output ?? []) {
    for (const contentItem of item.content ?? []) {
      if (contentItem.type === "refusal" && contentItem.refusal) {
        throw new Error(contentItem.refusal);
      }

      if (contentItem.type === "output_text" && contentItem.text?.trim()) {
        return contentItem.text;
      }
    }
  }

  throw new Error("OpenAI returned no structured content.");
}
