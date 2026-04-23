import type {
  MailAssistantProvider,
  MailAssistantProviderConnectionResult,
  OllamaModelListResult
} from "../../src/shared/ai/mail-assistant";

export type MailAssistantProviderFailureCode =
  | "not-configured"
  | "network"
  | "transient"
  | "bad-request"
  | "refusal"
  | "parse";

export class MailAssistantProviderError extends Error {
  readonly provider: MailAssistantProvider;
  readonly code: MailAssistantProviderFailureCode;
  readonly status: number | null;

  constructor(options: {
    provider: MailAssistantProvider;
    code: MailAssistantProviderFailureCode;
    message: string;
    status?: number | null;
  }) {
    super(options.message);
    this.name = "MailAssistantProviderError";
    this.provider = options.provider;
    this.code = options.code;
    this.status = options.status ?? null;
  }
}

export interface MailAssistantProviderExecutionConfig {
  provider: MailAssistantProvider;
  model: string;
  temperature: number | null;
  maxOutputTokens: number;
  baseUrl: string | null;
  apiKey: string | null;
}

export interface MailAssistantStructuredRequest {
  config: MailAssistantProviderExecutionConfig;
  instructions: string;
  input: string;
  schema: {
    name?: string;
    schema?: object;
  };
}

export interface MailAssistantProviderResponse<TResult> {
  provider: MailAssistantProvider;
  model: string;
  data: TResult;
}

export interface MailAssistantProviderAdapter {
  execute<TResult>(
    request: MailAssistantStructuredRequest
  ): Promise<MailAssistantProviderResponse<TResult>>;
  testConnection(
    config: MailAssistantProviderExecutionConfig
  ): Promise<MailAssistantProviderConnectionResult>;
  listModels?(baseUrl: string): Promise<OllamaModelListResult>;
}

export function isFallbackEligibleProviderError(error: unknown): boolean {
  return (
    error instanceof MailAssistantProviderError &&
    (error.code === "not-configured" ||
      error.code === "network" ||
      error.code === "transient" ||
      error.code === "parse")
  );
}
