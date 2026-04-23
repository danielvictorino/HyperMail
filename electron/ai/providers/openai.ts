import type { MailAssistantProviderConnectionResult } from "../../../src/shared/ai/mail-assistant";
import {
  MailAssistantProviderError,
  type MailAssistantProviderAdapter,
  type MailAssistantProviderExecutionConfig,
  type MailAssistantProviderResponse,
  type MailAssistantStructuredRequest
} from "../provider-types";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const OPENAI_REQUEST_TIMEOUT_MS = 45_000;
const HEALTH_CHECK_SCHEMA = {
  type: "json_schema",
  name: "hypermail_provider_health",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      ok: { type: "boolean" },
      message: { type: "string" }
    },
    required: ["ok", "message"]
  }
} as const;

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

export const openAiProviderAdapter: MailAssistantProviderAdapter = {
  async execute<TResult>(
    request: MailAssistantStructuredRequest
  ): Promise<MailAssistantProviderResponse<TResult>> {
    assertOpenAiConfig(request.config);

    const response = await fetchWithProviderHandling(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${request.config.apiKey}`
      },
      body: JSON.stringify({
        model: request.config.model,
        instructions: request.instructions,
        input: [
          {
            role: "user",
            content: request.input
          }
        ],
        max_output_tokens: request.config.maxOutputTokens,
        temperature: request.config.temperature ?? undefined,
        text: request.schema
      }),
      signal: AbortSignal.timeout(OPENAI_REQUEST_TIMEOUT_MS)
    });

    const payload = (await parseJsonResponse(response)) as OpenAiResponsePayload;

    if (!response.ok) {
      throw new MailAssistantProviderError({
        provider: "openai",
        code: isTransientStatus(response.status) ? "transient" : "bad-request",
        message:
          payload.error?.message ?? "OpenAI did not return a successful response.",
        status: response.status
      });
    }

    const responseText = extractStructuredOutput(payload);

    try {
      return {
        provider: "openai",
        model: request.config.model,
        data: JSON.parse(responseText) as TResult
      };
    } catch {
      throw new MailAssistantProviderError({
        provider: "openai",
        code: "parse",
        message: "OpenAI returned malformed structured output."
      });
    }
  },

  async testConnection(
    config: MailAssistantProviderExecutionConfig
  ): Promise<MailAssistantProviderConnectionResult> {
    const result = await openAiProviderAdapter.execute<{
      ok: boolean;
      message: string;
    }>({
      config: {
        ...config,
        maxOutputTokens: Math.min(config.maxOutputTokens, 120)
      },
      instructions:
        "Return a tiny JSON object confirming that the provider is reachable.",
      input: 'Return {"ok":true,"message":"ready"} using the supplied schema.',
      schema: HEALTH_CHECK_SCHEMA
    });

    return {
      provider: "openai",
      ok: Boolean(result.data.ok),
      message: result.data.message,
      model: config.model
    };
  }
};

function assertOpenAiConfig(config: MailAssistantProviderExecutionConfig): void {
  if (!config.apiKey?.trim()) {
    throw new MailAssistantProviderError({
      provider: "openai",
      code: "not-configured",
      message: "OpenAI API key is missing."
    });
  }

  if (!config.model.trim()) {
    throw new MailAssistantProviderError({
      provider: "openai",
      code: "not-configured",
      message: "OpenAI model is missing."
    });
  }
}

async function fetchWithProviderHandling(
  input: RequestInfo | URL,
  init: RequestInit
): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch (error) {
    throw new MailAssistantProviderError({
      provider: "openai",
      code: "network",
      message:
        error instanceof Error
          ? error.message
          : "OpenAI request failed to reach the network."
    });
  }
}

async function parseJsonResponse(response: Response): Promise<unknown> {
  try {
    return (await response.json()) as unknown;
  } catch {
    return {};
  }
}

function extractStructuredOutput(payload: OpenAiResponsePayload): string {
  if (payload.output_text?.trim()) {
    return payload.output_text;
  }

  for (const item of payload.output ?? []) {
    for (const contentItem of item.content ?? []) {
      if (contentItem.type === "refusal" && contentItem.refusal) {
        throw new MailAssistantProviderError({
          provider: "openai",
          code: "refusal",
          message: contentItem.refusal
        });
      }

      if (contentItem.type === "output_text" && contentItem.text?.trim()) {
        return contentItem.text;
      }
    }
  }

  throw new MailAssistantProviderError({
    provider: "openai",
    code: "parse",
    message: "OpenAI returned no structured content."
  });
}

function isTransientStatus(status: number): boolean {
  return (
    status === 408 ||
    status === 409 ||
    status === 425 ||
    status === 429 ||
    status >= 500
  );
}
