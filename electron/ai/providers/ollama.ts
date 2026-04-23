import type {
  MailAssistantProviderConnectionResult,
  OllamaModelListResult
} from "../../../src/shared/ai/mail-assistant";
import {
  getOllamaChatUrl,
  getOllamaTagsUrl
} from "../../../src/shared/ai/mail-assistant";
import {
  MailAssistantProviderError,
  type MailAssistantProviderAdapter,
  type MailAssistantProviderExecutionConfig,
  type MailAssistantProviderResponse,
  type MailAssistantStructuredRequest
} from "../provider-types";

const OLLAMA_REQUEST_TIMEOUT_MS = 45_000;

interface OllamaChatResponsePayload {
  error?: string;
  message?: {
    role?: string;
    content?: string;
  };
}

interface OllamaTagsPayload {
  error?: string;
  models?: Array<{
    name?: string;
    model?: string;
  }>;
}

export const ollamaProviderAdapter: MailAssistantProviderAdapter = {
  async execute<TResult>(
    request: MailAssistantStructuredRequest
  ): Promise<MailAssistantProviderResponse<TResult>> {
    assertOllamaConfig(request.config);
    const baseUrl = request.config.baseUrl ?? "";

    const response = await fetchWithProviderHandling(getOllamaChatUrl(baseUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: request.config.model,
        messages: [
          {
            role: "system",
            content: request.instructions
          },
          {
            role: "user",
            content: request.input
          }
        ],
        format: request.schema.schema ?? request.schema,
        stream: false,
        options: {
          temperature: request.config.temperature ?? undefined,
          num_predict: request.config.maxOutputTokens
        }
      }),
      signal: AbortSignal.timeout(OLLAMA_REQUEST_TIMEOUT_MS)
    });

    const payload = (await parseJsonResponse(response)) as OllamaChatResponsePayload;

    if (!response.ok) {
      throw new MailAssistantProviderError({
        provider: "ollama",
        code: isTransientStatus(response.status) ? "transient" : "bad-request",
        message: payload.error ?? "Ollama did not return a successful response.",
        status: response.status
      });
    }

    if (!payload.message?.content?.trim()) {
      throw new MailAssistantProviderError({
        provider: "ollama",
        code: "parse",
        message: "Ollama returned no structured content."
      });
    }

    try {
      return {
        provider: "ollama",
        model: request.config.model,
        data: JSON.parse(payload.message.content) as TResult
      };
    } catch {
      throw new MailAssistantProviderError({
        provider: "ollama",
        code: "parse",
        message: "Ollama returned malformed structured output."
      });
    }
  },

  async testConnection(
    config: MailAssistantProviderExecutionConfig
  ): Promise<MailAssistantProviderConnectionResult> {
    assertOllamaConfig(config);
    const models = await ollamaProviderAdapter.listModels!(config.baseUrl ?? "");
    const hasModel = models.models.includes(config.model);

    return {
      provider: "ollama",
      ok: hasModel,
      message: hasModel
        ? "Ollama is reachable and the selected model is installed."
        : "Ollama is reachable, but the selected model is not installed.",
      model: config.model,
      baseUrl: config.baseUrl
    };
  },

  async listModels(baseUrl: string): Promise<OllamaModelListResult> {
    const normalizedBaseUrl = baseUrl.trim();

    if (!normalizedBaseUrl) {
      throw new MailAssistantProviderError({
        provider: "ollama",
        code: "not-configured",
        message: "Ollama base URL is missing."
      });
    }

    const response = await fetchWithProviderHandling(
      getOllamaTagsUrl(normalizedBaseUrl),
      {
        method: "GET",
        headers: {
          Accept: "application/json"
        },
        signal: AbortSignal.timeout(OLLAMA_REQUEST_TIMEOUT_MS)
      }
    );
    const payload = (await parseJsonResponse(response)) as OllamaTagsPayload;

    if (!response.ok) {
      throw new MailAssistantProviderError({
        provider: "ollama",
        code: isTransientStatus(response.status) ? "transient" : "bad-request",
        message: payload.error ?? "Ollama model discovery failed.",
        status: response.status
      });
    }

    const models = (payload.models ?? [])
      .map((model) => model.name?.trim() || model.model?.trim() || "")
      .filter(
        (name, index, values) => name.length > 0 && values.indexOf(name) === index
      )
      .sort((left, right) => left.localeCompare(right));

    return {
      baseUrl: normalizedBaseUrl,
      models
    };
  }
};

function assertOllamaConfig(config: MailAssistantProviderExecutionConfig): void {
  if (!config.baseUrl?.trim()) {
    throw new MailAssistantProviderError({
      provider: "ollama",
      code: "not-configured",
      message: "Ollama base URL is missing."
    });
  }

  if (!config.model.trim()) {
    throw new MailAssistantProviderError({
      provider: "ollama",
      code: "not-configured",
      message: "Ollama model is missing."
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
      provider: "ollama",
      code: "network",
      message:
        error instanceof Error
          ? error.message
          : "Ollama request failed to reach the network."
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
