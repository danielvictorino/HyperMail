import type {
  GenerateDraftReplyRequest,
  GenerateDraftReplyResult,
  ListOllamaModelsRequest,
  SaveMailAssistantSettingsResult,
  SuggestSplitRequest,
  SuggestSplitResult,
  SummarizeThreadRequest,
  SummarizeThreadResult,
  TestMailAssistantProviderConnectionRequest
} from "../../src/shared/contracts";
import {
  buildDraftReplyInput,
  buildDraftReplyInstructions,
  buildSplitSuggestionInput,
  buildSplitSuggestionInstructions,
  buildThreadSummaryInput,
  buildThreadSummaryInstructions,
  MAIL_ASSISTANT_PROVIDERS,
  MAIL_DRAFT_SUGGESTION_SCHEMA,
  MAIL_SPLIT_SUGGESTION_SCHEMA,
  MAIL_THREAD_SUMMARY_SCHEMA,
  mergeMailAssistantSettings,
  normalizeOllamaBaseUrl,
  providerUsesApiKey,
  resolveMailAssistantMaxOutputTokens,
  resolveMailAssistantTemperature,
  sanitizeMailAssistantSettingsInput,
  type MailAssistantProvider,
  type MailAssistantProviderConfig,
  type MailAssistantProviderConnectionResult,
  type MailAssistantRuntimeConfig,
  type MailAssistantSettings,
  type MailAssistantSettingsSeed,
  type MailAssistantSettingsInput,
  type MailDraftSuggestion,
  type MailSplitSuggestion,
  type MailThreadSummary,
  DEFAULT_OLLAMA_BASE_URL,
  getProviderLabel
} from "../../src/shared/ai/mail-assistant";
import { getRuntimeConfigSummary } from "../runtime/runtime-config";
import {
  loadPersistedMailAssistantSecrets,
  loadPersistedMailAssistantSettings,
  savePersistedMailAssistantSecret,
  savePersistedMailAssistantSettings,
  type MailAssistantSecrets
} from "./ai-settings-store";
import { anthropicProviderAdapter } from "./providers/anthropic";
import { ollamaProviderAdapter } from "./providers/ollama";
import { openAiProviderAdapter } from "./providers/openai";
import {
  MailAssistantProviderError,
  isFallbackEligibleProviderError,
  type MailAssistantProviderAdapter,
  type MailAssistantProviderExecutionConfig
} from "./provider-types";

const providerAdapters: Record<MailAssistantProvider, MailAssistantProviderAdapter> = {
  openai: openAiProviderAdapter,
  anthropic: anthropicProviderAdapter,
  ollama: ollamaProviderAdapter
};

export async function getMailAssistantSettings(): Promise<MailAssistantSettings> {
  const { settings } = await loadMailAssistantState();
  return settings;
}

export async function getMailAssistantRuntimeConfig(): Promise<MailAssistantRuntimeConfig> {
  const { runtimeConfig } = await loadMailAssistantState();
  return runtimeConfig;
}

export async function saveMailAssistantSettings(
  input: MailAssistantSettingsInput
): Promise<SaveMailAssistantSettingsResult> {
  const sanitizedSettings = sanitizeMailAssistantSettingsInput(input);

  await savePersistedMailAssistantSettings(sanitizedSettings);
  await persistSecretsFromInput(input);

  return {
    settings: sanitizedSettings,
    runtimeConfig: await getMailAssistantRuntimeConfig()
  };
}

export async function testMailAssistantProviderConnection(
  input: TestMailAssistantProviderConnectionRequest
): Promise<MailAssistantProviderConnectionResult> {
  const settings = sanitizeMailAssistantSettingsInput(input.settings);
  const secrets = await loadResolvedSecrets(input.settings);

  try {
    return await providerAdapters[input.provider].testConnection(
      createExecutionConfig(settings, secrets, input.provider, 120)
    );
  } catch (error) {
    return buildFailedConnectionResult(
      input.provider,
      settings.providers[input.provider],
      error
    );
  }
}

export async function listOllamaModels(
  input?: ListOllamaModelsRequest
): Promise<{ baseUrl: string; models: string[] }> {
  const settings = await getMailAssistantSettings();
  const baseUrl = input?.baseUrl?.trim()
    ? normalizeOllamaBaseUrl(input.baseUrl)
    : (settings.providers.ollama.baseUrl ?? DEFAULT_OLLAMA_BASE_URL);

  return await ollamaProviderAdapter.listModels!(baseUrl);
}

export async function summarizeThread(
  input: SummarizeThreadRequest
): Promise<SummarizeThreadResult> {
  const result = await requestWithFallback<MailThreadSummary>({
    instructions: buildThreadSummaryInstructions(),
    input: buildThreadSummaryInput(input.thread),
    format: MAIL_THREAD_SUMMARY_SCHEMA,
    maxOutputTokens: 500
  });

  return {
    summary: result.data,
    provider: result.provider,
    model: result.model,
    generatedAt: Date.now(),
    fallbackUsed: result.fallbackUsed
  };
}

export async function suggestSplit(
  input: SuggestSplitRequest
): Promise<SuggestSplitResult> {
  const result = await requestWithFallback<MailSplitSuggestion>({
    instructions: buildSplitSuggestionInstructions(),
    input: buildSplitSuggestionInput(input.thread),
    format: MAIL_SPLIT_SUGGESTION_SCHEMA,
    maxOutputTokens: 350
  });

  return {
    suggestion: result.data,
    provider: result.provider,
    model: result.model,
    generatedAt: Date.now(),
    fallbackUsed: result.fallbackUsed
  };
}

export async function generateDraftReply(
  input: GenerateDraftReplyRequest
): Promise<GenerateDraftReplyResult> {
  const result = await requestWithFallback<MailDraftSuggestion>({
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
    draft: result.data,
    provider: result.provider,
    model: result.model,
    generatedAt: Date.now(),
    fallbackUsed: result.fallbackUsed
  };
}

async function requestWithFallback<TResult>(options: {
  instructions: string;
  input: string;
  format: object;
  maxOutputTokens: number;
}): Promise<{
  data: TResult;
  provider: MailAssistantProvider;
  model: string;
  fallbackUsed: boolean;
}> {
  const { settings, secrets, runtimeConfig } = await loadMailAssistantState();

  if (!runtimeConfig.enabled) {
    throw new Error(runtimeConfig.reason ?? "AI assistance is not configured.");
  }

  const primaryProvider = settings.primaryProvider;

  try {
    const result = await providerAdapters[primaryProvider].execute<TResult>({
      config: createExecutionConfig(
        settings,
        secrets,
        primaryProvider,
        options.maxOutputTokens
      ),
      instructions: options.instructions,
      input: options.input,
      schema: options.format as { name?: string; schema?: object }
    });

    return {
      ...result,
      fallbackUsed: false
    };
  } catch (error) {
    const fallbackProvider = settings.fallbackProvider;

    if (
      !fallbackProvider ||
      fallbackProvider === primaryProvider ||
      !runtimeConfig.providerStatuses[fallbackProvider].available ||
      !isFallbackEligibleProviderError(error)
    ) {
      throw normalizeAssistantError(error);
    }

    try {
      const fallbackResult = await providerAdapters[fallbackProvider].execute<TResult>({
        config: createExecutionConfig(
          settings,
          secrets,
          fallbackProvider,
          options.maxOutputTokens
        ),
        instructions: options.instructions,
        input: options.input,
        schema: options.format as { name?: string; schema?: object }
      });

      return {
        ...fallbackResult,
        fallbackUsed: true
      };
    } catch (fallbackError) {
      throw normalizeAssistantError(fallbackError);
    }
  }
}

async function loadMailAssistantState(): Promise<{
  settings: MailAssistantSettings;
  secrets: MailAssistantSecrets;
  runtimeConfig: MailAssistantRuntimeConfig;
}> {
  const settings = await loadResolvedSettings();
  const secrets = await loadResolvedSecrets();
  const runtimeConfig = buildRuntimeConfig(settings, secrets);

  return {
    settings,
    secrets,
    runtimeConfig
  };
}

async function loadResolvedSettings(): Promise<MailAssistantSettings> {
  const envDefaults = readEnvSettings();
  const persistedSettings = await loadPersistedMailAssistantSettings();
  return mergeMailAssistantSettings(envDefaults, persistedSettings);
}

async function loadResolvedSecrets(
  input?: MailAssistantSettingsInput
): Promise<MailAssistantSecrets> {
  const persistedSecrets = await loadPersistedMailAssistantSecrets();
  const secrets: MailAssistantSecrets = {
    openai: persistedSecrets.openai ?? readEnvSecret("OPENAI_API_KEY"),
    anthropic: persistedSecrets.anthropic ?? readEnvSecret("ANTHROPIC_API_KEY")
  };

  if (!input) {
    return secrets;
  }

  for (const provider of ["openai", "anthropic"] as const) {
    const providerInput = input.providers[provider];

    if (providerInput.clearApiKey) {
      secrets[provider] = null;
      continue;
    }

    const candidate = providerInput.apiKey?.trim();

    if (candidate) {
      secrets[provider] = candidate;
    }
  }

  return secrets;
}

function buildRuntimeConfig(
  settings: MailAssistantSettings,
  secrets: MailAssistantSecrets
): MailAssistantRuntimeConfig {
  const providerStatuses = buildProviderStatuses(settings, secrets);
  const primaryStatus = providerStatuses[settings.primaryProvider];
  const fallbackStatus = settings.fallbackProvider
    ? providerStatuses[settings.fallbackProvider]
    : null;
  const activeProvider = primaryStatus.available
    ? settings.primaryProvider
    : fallbackStatus?.available
      ? settings.fallbackProvider
      : null;
  const activeModel = activeProvider ? settings.providers[activeProvider].model : null;

  return {
    enabled: activeProvider !== null,
    provider: settings.primaryProvider,
    model: settings.providers[settings.primaryProvider].model,
    fallbackProvider: settings.fallbackProvider,
    fallbackModel: settings.fallbackProvider
      ? settings.providers[settings.fallbackProvider].model
      : null,
    activeProvider,
    activeModel,
    reason: buildRuntimeReason(settings, providerStatuses, activeProvider),
    settings,
    providerStatuses
  };
}

function buildProviderStatuses(
  settings: MailAssistantSettings,
  secrets: MailAssistantSecrets
): MailAssistantRuntimeConfig["providerStatuses"] {
  const configSummary = getRuntimeConfigSummary();
  const preferredConfigPath = configSummary.preferredConfigPath;

  return {
    openai: buildProviderStatus(
      "openai",
      settings.providers.openai,
      Boolean(secrets.openai?.trim()),
      preferredConfigPath
    ),
    anthropic: buildProviderStatus(
      "anthropic",
      settings.providers.anthropic,
      Boolean(secrets.anthropic?.trim()),
      preferredConfigPath
    ),
    ollama: buildProviderStatus(
      "ollama",
      settings.providers.ollama,
      true,
      preferredConfigPath
    )
  };
}

function buildProviderStatus(
  provider: MailAssistantProvider,
  config: MailAssistantProviderConfig,
  hasSecret: boolean,
  preferredConfigPath: string
) {
  if (!config.model.trim()) {
    return {
      provider,
      label: getProviderLabel(provider),
      available: false,
      hasSecret,
      reason: `Choose a ${getProviderLabel(provider)} model.`
    };
  }

  if (providerUsesApiKey(provider) && !hasSecret) {
    const envKey = provider === "openai" ? "OPENAI_API_KEY" : "ANTHROPIC_API_KEY";
    return {
      provider,
      label: getProviderLabel(provider),
      available: false,
      hasSecret,
      reason: `Add a ${getProviderLabel(provider)} API key in HyperMail AI settings or ${envKey} in ${preferredConfigPath}.`
    };
  }

  if (provider === "ollama" && !config.baseUrl?.trim()) {
    return {
      provider,
      label: getProviderLabel(provider),
      available: false,
      hasSecret,
      reason: "Set an Ollama base URL."
    };
  }

  return {
    provider,
    label: getProviderLabel(provider),
    available: true,
    hasSecret,
    reason: undefined
  };
}

function buildRuntimeReason(
  settings: MailAssistantSettings,
  providerStatuses: MailAssistantRuntimeConfig["providerStatuses"],
  activeProvider: MailAssistantProvider | null
): string | undefined {
  const primaryStatus = providerStatuses[settings.primaryProvider];
  const fallbackStatus = settings.fallbackProvider
    ? providerStatuses[settings.fallbackProvider]
    : null;

  if (activeProvider === null) {
    if (primaryStatus.reason && fallbackStatus?.reason) {
      return `${primaryStatus.reason} Fallback: ${fallbackStatus.reason}`;
    }

    return (
      primaryStatus.reason ??
      fallbackStatus?.reason ??
      "AI assistance is not configured."
    );
  }

  if (
    settings.fallbackProvider &&
    activeProvider === settings.fallbackProvider &&
    !primaryStatus.available
  ) {
    return `Primary ${primaryStatus.label} is unavailable. HyperMail will use ${fallbackStatus?.label ?? "the fallback provider"} until the primary is configured again.`;
  }

  return undefined;
}

function createExecutionConfig(
  settings: MailAssistantSettings,
  secrets: MailAssistantSecrets,
  provider: MailAssistantProvider,
  fallbackMaxOutputTokens: number
): MailAssistantProviderExecutionConfig {
  const config = settings.providers[provider];

  return {
    provider,
    model: config.model,
    temperature: resolveMailAssistantTemperature(provider, config),
    maxOutputTokens: resolveMailAssistantMaxOutputTokens(
      provider,
      config,
      fallbackMaxOutputTokens
    ),
    baseUrl: provider === "ollama" ? config.baseUrl : null,
    apiKey: providerUsesApiKey(provider) ? (secrets[provider] ?? null) : null
  };
}

async function persistSecretsFromInput(
  input: MailAssistantSettingsInput
): Promise<void> {
  for (const provider of MAIL_ASSISTANT_PROVIDERS) {
    if (!providerUsesApiKey(provider)) {
      continue;
    }

    const providerInput = input.providers[provider];

    if (providerInput.clearApiKey) {
      await savePersistedMailAssistantSecret(provider, "");
      continue;
    }

    const nextApiKey = providerInput.apiKey?.trim();

    if (nextApiKey) {
      await savePersistedMailAssistantSecret(provider, nextApiKey);
    }
  }
}

function readEnvSettings(): MailAssistantSettingsSeed {
  const primaryProvider = parseProviderEnv(process.env.HYPERMAIL_AI_PRIMARY_PROVIDER);

  return {
    primaryProvider: primaryProvider ?? undefined,
    fallbackProvider: parseProviderEnv(process.env.HYPERMAIL_AI_FALLBACK_PROVIDER),
    providers: {
      openai: {
        model: process.env.OPENAI_MODEL?.trim()
      },
      anthropic: {
        model: process.env.ANTHROPIC_MODEL?.trim()
      },
      ollama: {
        model: process.env.OLLAMA_MODEL?.trim(),
        baseUrl: process.env.OLLAMA_BASE_URL?.trim()
      }
    }
  };
}

function parseProviderEnv(
  value: string | undefined
): MailAssistantProvider | null | undefined {
  const normalizedValue = value?.trim().toLowerCase();

  if (!normalizedValue) {
    return undefined;
  }

  if ((MAIL_ASSISTANT_PROVIDERS as readonly string[]).includes(normalizedValue)) {
    return normalizedValue as MailAssistantProvider;
  }

  if (normalizedValue === "none") {
    return null;
  }

  return undefined;
}

function readEnvSecret(key: string): string | null {
  const value = process.env[key]?.trim();
  return value ? value : null;
}

function buildFailedConnectionResult(
  provider: MailAssistantProvider,
  config: MailAssistantProviderConfig,
  error: unknown
): MailAssistantProviderConnectionResult {
  if (error instanceof MailAssistantProviderError) {
    return {
      provider,
      ok: false,
      message: error.message,
      model: config.model,
      baseUrl: provider === "ollama" ? config.baseUrl : null
    };
  }

  return {
    provider,
    ok: false,
    message:
      error instanceof Error ? error.message : "Provider connection test failed.",
    model: config.model,
    baseUrl: provider === "ollama" ? config.baseUrl : null
  };
}

function normalizeAssistantError(error: unknown): Error {
  if (error instanceof MailAssistantProviderError) {
    return new Error(error.message);
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error("Unknown HyperMail AI runtime error.");
}
