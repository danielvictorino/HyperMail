import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CheckCheck, LoaderCircle, PlugZap, RotateCcw, Save } from "lucide-react";
import {
  ANTHROPIC_MODEL_SUGGESTIONS,
  MAIL_ASSISTANT_PROVIDERS,
  OPENAI_MODEL_SUGGESTIONS,
  getProviderLabel,
  type MailAssistantProvider,
  type MailAssistantProviderConnectionResult,
  type MailAssistantRuntimeConfig,
  type MailAssistantSettingsInput,
  type OllamaModelListResult
} from "@shared/ai/mail-assistant";
import { cn } from "@/lib/utils";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";

interface AiSettingsPanelProps {
  assistantConfig: MailAssistantRuntimeConfig;
  assistantError: string | null;
  onSaveSettings: (settings: MailAssistantSettingsInput) => Promise<void>;
  onTestProviderConnection: (
    provider: MailAssistantProvider,
    settings: MailAssistantSettingsInput
  ) => Promise<MailAssistantProviderConnectionResult>;
  onListOllamaModels: (baseUrl?: string | null) => Promise<OllamaModelListResult>;
}

interface ProviderMessageState {
  tone: "success" | "error";
  text: string;
}

export function AiSettingsPanel({
  assistantConfig,
  assistantError,
  onSaveSettings,
  onTestProviderConnection,
  onListOllamaModels
}: AiSettingsPanelProps) {
  const [draft, setDraft] = useState<MailAssistantSettingsInput>(() =>
    createDraftSettings(assistantConfig)
  );
  const [providerMessages, setProviderMessages] = useState<
    Partial<Record<MailAssistantProvider, ProviderMessageState>>
  >({});
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshingOllama, setIsRefreshingOllama] = useState(false);
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [ollamaDiscoveryMessage, setOllamaDiscoveryMessage] = useState<string | null>(
    null
  );
  const [providerBusy, setProviderBusy] = useState<
    Record<MailAssistantProvider, boolean>
  >({
    openai: false,
    anthropic: false,
    ollama: false
  });

  useEffect(() => {
    setDraft(createDraftSettings(assistantConfig));
    setProviderMessages({});
  }, [assistantConfig]);

  const ollamaModelOptions = useMemo(() => {
    const currentModel = draft.providers.ollama.model.trim();
    const combined = [...ollamaModels];

    if (currentModel && !combined.includes(currentModel)) {
      combined.unshift(currentModel);
    }

    return combined;
  }, [draft.providers.ollama.model, ollamaModels]);

  async function handleSaveSettings(): Promise<void> {
    setIsSaving(true);

    try {
      await onSaveSettings(draft);
      setOllamaDiscoveryMessage("AI settings saved locally.");
    } catch (error) {
      setOllamaDiscoveryMessage(
        error instanceof Error ? error.message : "HyperMail could not save AI settings."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleProviderTest(provider: MailAssistantProvider): Promise<void> {
    setProviderBusy((current) => ({ ...current, [provider]: true }));

    try {
      const result = await onTestProviderConnection(provider, draft);
      setProviderMessages((current) => ({
        ...current,
        [provider]: {
          tone: result.ok ? "success" : "error",
          text: result.message
        }
      }));
    } catch (error) {
      setProviderMessages((current) => ({
        ...current,
        [provider]: {
          tone: "error",
          text:
            error instanceof Error ? error.message : "Provider connection test failed."
        }
      }));
    } finally {
      setProviderBusy((current) => ({ ...current, [provider]: false }));
    }
  }

  async function handleRefreshOllamaModels(): Promise<void> {
    setIsRefreshingOllama(true);

    try {
      const result = await onListOllamaModels(draft.providers.ollama.baseUrl);
      setOllamaModels(result.models);
      setOllamaDiscoveryMessage(
        result.models.length > 0
          ? `Loaded ${result.models.length} Ollama model${result.models.length === 1 ? "" : "s"}.`
          : "Ollama is reachable, but no models are installed yet."
      );
    } catch (error) {
      setOllamaDiscoveryMessage(
        error instanceof Error
          ? error.message
          : "HyperMail could not load Ollama models."
      );
    } finally {
      setIsRefreshingOllama(false);
    }
  }

  function updatePrimaryProvider(provider: MailAssistantProvider): void {
    setDraft((current) => ({
      ...current,
      primaryProvider: provider,
      fallbackProvider:
        current.fallbackProvider === provider ? null : current.fallbackProvider
    }));
  }

  function updateFallbackProvider(value: string): void {
    setDraft((current) => ({
      ...current,
      fallbackProvider:
        value === "none" || value === current.primaryProvider
          ? null
          : (value as MailAssistantProvider)
    }));
  }

  function updateProviderField(
    provider: MailAssistantProvider,
    field: keyof MailAssistantSettingsInput["providers"][MailAssistantProvider],
    value: string | number | boolean | null
  ): void {
    setDraft((current) => ({
      ...current,
      providers: {
        ...current.providers,
        [provider]: {
          ...current.providers[provider],
          [field]: value
        }
      }
    }));
  }

  function renderProviderCard(
    provider: MailAssistantProvider,
    options: readonly string[],
    extraContent?: ReactNode
  ) {
    const providerStatus = assistantConfig.providerStatuses[provider];
    const config = draft.providers[provider];
    const isPrimary = draft.primaryProvider === provider;
    const isFallback = draft.fallbackProvider === provider;
    const providerMessage = providerMessages[provider];

    return (
      <div
        key={provider}
        className={cn(
          "rounded-lg border px-3 py-3",
          isPrimary || isFallback
            ? "border-accent/25 bg-accent/5"
            : "border-white/[0.1] bg-black/10"
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-foreground">
              {getProviderLabel(provider)}
            </p>
            {isPrimary ? (
              <Badge className="border-accent/25 bg-accent/10 text-accent">
                primary
              </Badge>
            ) : null}
            {isFallback ? (
              <Badge className="border-white/[0.1] bg-white/[0.035] text-muted">
                fallback
              </Badge>
            ) : null}
          </div>
          <Badge
            className={cn(
              "border-white/[0.1]",
              providerStatus.available
                ? "bg-positive/10 text-positive"
                : "bg-warning/10 text-warning"
            )}
          >
            {providerStatus.available ? "ready" : "needs setup"}
          </Badge>
        </div>

        <div className="mt-3 grid gap-3">
          <label className="grid gap-2">
            <span className="text-[11px] uppercase text-muted">Model</span>
            <select
              value={options.includes(config.model) ? config.model : "__custom__"}
              onChange={(event) => {
                if (event.target.value === "__custom__") {
                  return;
                }

                updateProviderField(provider, "model", event.target.value);
              }}
              className="hm-input-shell px-3 py-2 text-sm text-foreground outline-none transition focus:border-accent/40"
            >
              {options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
              <option value="__custom__">Custom model</option>
            </select>
            <input
              type="text"
              value={config.model}
              onChange={(event) =>
                updateProviderField(provider, "model", event.target.value)
              }
              placeholder="Enter a model id"
              className="hm-input-shell px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-muted focus:border-accent/40"
            />
          </label>

          {provider !== "ollama" ? (
            <label className="grid gap-2">
              <span className="text-[11px] uppercase text-muted">API key</span>
              <input
                type="password"
                value={config.apiKey ?? ""}
                onChange={(event) => {
                  updateProviderField(provider, "apiKey", event.target.value);
                  updateProviderField(provider, "clearApiKey", false);
                }}
                placeholder={
                  providerStatus.hasSecret
                    ? "Stored key will be kept unless replaced"
                    : "Paste API key"
                }
                className="hm-input-shell px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-muted focus:border-accent/40"
              />
              <div className="flex items-center justify-between gap-3 text-xs text-muted">
                <span>
                  {config.clearApiKey
                    ? "Saved key will be removed on save."
                    : providerStatus.hasSecret
                      ? "A key is already available for this provider."
                      : "No key stored yet."}
                </span>
                {providerStatus.hasSecret || config.clearApiKey ? (
                  <button
                    type="button"
                    className="text-accent transition hover:brightness-110"
                    onClick={() => {
                      updateProviderField(provider, "apiKey", "");
                      updateProviderField(provider, "clearApiKey", !config.clearApiKey);
                    }}
                  >
                    {config.clearApiKey ? "Keep saved key" : "Clear saved key"}
                  </button>
                ) : null}
              </div>
            </label>
          ) : null}

          {provider === "ollama" ? (
            <>
              <label className="grid gap-2">
                <span className="text-[11px] uppercase text-muted">Base URL</span>
                <input
                  type="text"
                  value={config.baseUrl ?? ""}
                  onChange={(event) =>
                    updateProviderField(provider, "baseUrl", event.target.value)
                  }
                  placeholder="http://127.0.0.1:11434"
                  className="hm-input-shell px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-muted focus:border-accent/40"
                />
              </label>
              <div className="flex flex-col gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-between border border-white/[0.1] bg-white/[0.035]"
                  disabled={isRefreshingOllama}
                  onClick={() => void handleRefreshOllamaModels()}
                >
                  <span>Refresh Ollama models</span>
                  {isRefreshingOllama ? (
                    <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RotateCcw className="h-3.5 w-3.5" />
                  )}
                </Button>
                {ollamaModelOptions.length > 0 ? (
                  <select
                    value={
                      ollamaModelOptions.includes(config.model)
                        ? config.model
                        : "__custom__"
                    }
                    onChange={(event) => {
                      if (event.target.value === "__custom__") {
                        return;
                      }

                      updateProviderField(provider, "model", event.target.value);
                    }}
                    className="hm-input-shell px-3 py-2 text-sm text-foreground outline-none transition focus:border-accent/40"
                  >
                    {ollamaModelOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                    <option value="__custom__">Custom model</option>
                  </select>
                ) : null}
              </div>
            </>
          ) : null}

          <label className="grid gap-2">
            <span className="text-[11px] uppercase text-muted">Preset</span>
            <select
              value={config.presetId ?? "balanced"}
              onChange={(event) =>
                updateProviderField(
                  provider,
                  "presetId",
                  event.target.value as "balanced" | "quality" | "fast" | "cheap"
                )
              }
              className="hm-input-shell px-3 py-2 text-sm text-foreground outline-none transition focus:border-accent/40"
            >
              <option value="balanced">balanced</option>
              <option value="quality">quality</option>
              <option value="fast">fast</option>
              <option value="cheap">cheap</option>
            </select>
          </label>

          {extraContent}

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs leading-5 text-muted">
              {providerStatus.reason ??
                "Provider is configured and ready for AI actions."}
            </p>
            <Button
              variant="secondary"
              size="sm"
              className="justify-between"
              disabled={providerBusy[provider]}
              onClick={() => void handleProviderTest(provider)}
            >
              <span>Test</span>
              {providerBusy[provider] ? (
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <PlugZap className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>

          {providerMessage ? (
            <p
              className={cn(
                "text-xs leading-5",
                providerMessage.tone === "success" ? "text-positive" : "text-warning"
              )}
            >
              {providerMessage.text}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="hm-rail-section">
      <div className="mb-3 flex items-center gap-2">
        <PlugZap className="h-4 w-4 text-accent" />
        <p className="text-sm font-medium text-foreground">AI providers</p>
      </div>

      <div className="grid gap-3">
        <label className="grid gap-2">
          <span className="text-[11px] uppercase text-muted">Primary provider</span>
          <select
            value={draft.primaryProvider}
            onChange={(event) =>
              updatePrimaryProvider(event.target.value as MailAssistantProvider)
            }
            className="hm-input-shell px-3 py-2 text-sm text-foreground outline-none transition focus:border-accent/40"
          >
            {MAIL_ASSISTANT_PROVIDERS.map((provider) => (
              <option key={provider} value={provider}>
                {getProviderLabel(provider)}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-[11px] uppercase text-muted">Fallback provider</span>
          <select
            value={draft.fallbackProvider ?? "none"}
            onChange={(event) => updateFallbackProvider(event.target.value)}
            className="hm-input-shell px-3 py-2 text-sm text-foreground outline-none transition focus:border-accent/40"
          >
            <option value="none">No automatic fallback</option>
            {MAIL_ASSISTANT_PROVIDERS.map((provider) => (
              <option
                key={provider}
                value={provider}
                disabled={provider === draft.primaryProvider}
              >
                {getProviderLabel(provider)}
              </option>
            ))}
          </select>
        </label>

        <div className="hm-list-surface grid gap-2 px-3 py-3 text-xs text-muted">
          <div className="flex items-center justify-between gap-3">
            <span>Selected route</span>
            <span className="font-medium text-foreground">
              {assistantConfig.activeProvider
                ? `${getProviderLabel(assistantConfig.activeProvider)} - ${assistantConfig.activeModel}`
                : "disabled"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span>Automatic fallback</span>
            <span className="font-medium text-foreground">
              {assistantConfig.fallbackProvider
                ? getProviderLabel(assistantConfig.fallbackProvider)
                : "none"}
            </span>
          </div>
        </div>

        {renderProviderCard("openai", OPENAI_MODEL_SUGGESTIONS)}
        {renderProviderCard("anthropic", ANTHROPIC_MODEL_SUGGESTIONS)}
        {renderProviderCard(
          "ollama",
          ollamaModelOptions,
          ollamaDiscoveryMessage ? (
            <p className="text-xs leading-5 text-muted">{ollamaDiscoveryMessage}</p>
          ) : null
        )}

        {assistantError ? (
          <p className="text-xs leading-5 text-warning">{assistantError}</p>
        ) : null}

        <Button
          variant="secondary"
          size="sm"
          className="justify-between"
          disabled={isSaving}
          onClick={() => void handleSaveSettings()}
        >
          <span>Save AI settings</span>
          {isSaving ? (
            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
        </Button>

        <div className="flex items-center gap-2 text-xs text-muted">
          <CheckCheck className="h-3.5 w-3.5 text-accent" />
          <span>
            Secrets stay local in OS secure storage. Provider selection stays in app
            data.
          </span>
        </div>
      </div>
    </div>
  );
}

function createDraftSettings(
  assistantConfig: MailAssistantRuntimeConfig
): MailAssistantSettingsInput {
  return {
    primaryProvider: assistantConfig.settings.primaryProvider,
    fallbackProvider: assistantConfig.settings.fallbackProvider,
    providers: {
      openai: { ...assistantConfig.settings.providers.openai },
      anthropic: { ...assistantConfig.settings.providers.anthropic },
      ollama: { ...assistantConfig.settings.providers.ollama }
    }
  };
}
