import type { MailAssistantProviderConnectionResult } from "../../../src/shared/ai/mail-assistant";
import {
  MailAssistantProviderError,
  type MailAssistantProviderAdapter,
  type MailAssistantProviderExecutionConfig,
  type MailAssistantProviderResponse,
  type MailAssistantStructuredRequest
} from "../provider-types";

const ANTHROPIC_MESSAGES_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const ANTHROPIC_REQUEST_TIMEOUT_MS = 45_000;
const HEALTH_CHECK_SCHEMA = {
  name: "hypermail_provider_health",
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

interface AnthropicResponsePayload {
  error?: {
    type?: string;
    message?: string;
  };
  content?: Array<
    | {
        type?: "text";
        text?: string;
      }
    | {
        type?: "tool_use";
        id?: string;
        name?: string;
        input?: unknown;
      }
  >;
}

export const anthropicProviderAdapter: MailAssistantProviderAdapter = {
  async execute<TResult>(
    request: MailAssistantStructuredRequest
  ): Promise<MailAssistantProviderResponse<TResult>> {
    assertAnthropicConfig(request.config);

    const toolName = request.schema.name?.trim() || "hypermail_response";
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "anthropic-version": ANTHROPIC_VERSION
    };

    if (request.config.apiKey) {
      headers["x-api-key"] = request.config.apiKey;
    }

    const response = await fetchWithProviderHandling(ANTHROPIC_MESSAGES_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: request.config.model,
        max_tokens: request.config.maxOutputTokens,
        temperature: request.config.temperature ?? undefined,
        system: request.instructions,
        messages: [
          {
            role: "user",
            content: request.input
          }
        ],
        tools: [
          {
            name: toolName,
            description:
              "Return the requested HyperMail structured JSON exactly once. Use empty arrays instead of omitting required keys.",
            input_schema: request.schema.schema ?? request.schema
          }
        ],
        tool_choice: {
          type: "tool",
          name: toolName
        },
        disable_parallel_tool_use: true
      }),
      signal: AbortSignal.timeout(ANTHROPIC_REQUEST_TIMEOUT_MS)
    });

    const payload = (await parseJsonResponse(response)) as AnthropicResponsePayload;

    if (!response.ok) {
      throw new MailAssistantProviderError({
        provider: "anthropic",
        code: isTransientStatus(response.status) ? "transient" : "bad-request",
        message:
          payload.error?.message ?? "Anthropic did not return a successful response.",
        status: response.status
      });
    }

    const toolUse = payload.content?.find(
      (contentBlock): contentBlock is { type?: "tool_use"; input?: unknown } =>
        contentBlock.type === "tool_use"
    );

    if (toolUse?.input && typeof toolUse.input === "object") {
      return {
        provider: "anthropic",
        model: request.config.model,
        data: toolUse.input as TResult
      };
    }

    const textMessage = payload.content
      ?.filter(
        (contentBlock): contentBlock is { type?: "text"; text?: string } =>
          contentBlock.type === "text"
      )
      .map((contentBlock) => contentBlock.text?.trim())
      .filter((value): value is string => Boolean(value))
      .join("\n");

    throw new MailAssistantProviderError({
      provider: "anthropic",
      code: textMessage ? "refusal" : "parse",
      message:
        textMessage || "Anthropic returned no structured tool output for the request."
    });
  },

  async testConnection(
    config: MailAssistantProviderExecutionConfig
  ): Promise<MailAssistantProviderConnectionResult> {
    const result = await anthropicProviderAdapter.execute<{
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
      provider: "anthropic",
      ok: Boolean(result.data.ok),
      message: result.data.message,
      model: config.model
    };
  }
};

function assertAnthropicConfig(config: MailAssistantProviderExecutionConfig): void {
  if (!config.apiKey?.trim()) {
    throw new MailAssistantProviderError({
      provider: "anthropic",
      code: "not-configured",
      message: "Anthropic API key is missing."
    });
  }

  if (!config.model.trim()) {
    throw new MailAssistantProviderError({
      provider: "anthropic",
      code: "not-configured",
      message: "Anthropic model is missing."
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
      provider: "anthropic",
      code: "network",
      message:
        error instanceof Error
          ? error.message
          : "Anthropic request failed to reach the network."
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

function isTransientStatus(status: number): boolean {
  return (
    status === 408 ||
    status === 409 ||
    status === 425 ||
    status === 429 ||
    status >= 500
  );
}
