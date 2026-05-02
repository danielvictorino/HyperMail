// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MailAssistantSettingsInput } from "@shared/ai/mail-assistant";
import {
  clickElement,
  findButton,
  findSelectByLabel,
  renderReact,
  setSelectValue
} from "@/test/render";
import { createAssistantRuntimeConfig } from "@/test/mail-fixtures";
import { AiSettingsPanel } from "./ai-settings-panel";

let view: ReturnType<typeof renderReact> | null = null;

afterEach(() => {
  view?.unmount();
  view = null;
});

describe("AiSettingsPanel", () => {
  it("saves edited provider route state", async () => {
    const onSaveSettings = vi.fn(async (_settings: MailAssistantSettingsInput) => {});

    view = renderReact(
      <AiSettingsPanel
        assistantConfig={createAssistantRuntimeConfig()}
        assistantError={null}
        onSaveSettings={onSaveSettings}
        onTestProviderConnection={vi.fn(async (provider, settings) => ({
          provider,
          ok: true,
          message: "ok",
          model: settings.providers[provider].model
        }))}
        onListOllamaModels={vi.fn(async () => ({
          baseUrl: "http://127.0.0.1:11434",
          models: []
        }))}
      />
    );

    await setSelectValue(
      findSelectByLabel(view.container, "Primary provider"),
      "anthropic"
    );
    await clickElement(findButton(view.container, "Save AI settings"));

    expect(onSaveSettings).toHaveBeenCalledOnce();
    expect(onSaveSettings.mock.calls[0]?.[0]).toMatchObject({
      primaryProvider: "anthropic",
      fallbackProvider: null
    });
  });

  it("refreshes Ollama model options from the configured base URL", async () => {
    const onListOllamaModels = vi.fn(async (baseUrl?: string | null) => ({
      baseUrl: baseUrl ?? "http://127.0.0.1:11434",
      models: ["llama3.2", "mistral"]
    }));

    view = renderReact(
      <AiSettingsPanel
        assistantConfig={createAssistantRuntimeConfig()}
        assistantError={null}
        onSaveSettings={vi.fn(async () => {})}
        onTestProviderConnection={vi.fn(async (provider, settings) => ({
          provider,
          ok: true,
          message: "ok",
          model: settings.providers[provider].model
        }))}
        onListOllamaModels={onListOllamaModels}
      />
    );

    await clickElement(findButton(view.container, "Refresh Ollama models"));

    expect(onListOllamaModels).toHaveBeenCalledWith("http://127.0.0.1:11434");
    expect(view.container.textContent).toContain("Loaded 2 Ollama models.");
  });
});
