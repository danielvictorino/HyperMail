import fs from "node:fs/promises";
import path from "node:path";
import keytar from "keytar";
import { app } from "electron";
import type {
  MailAssistantProvider,
  MailAssistantSettings,
  MailAssistantSettingsSeed
} from "../../src/shared/ai/mail-assistant";
import {
  mergeMailAssistantSettings,
  providerUsesApiKey
} from "../../src/shared/ai/mail-assistant";

const SERVICE_NAME = "HyperMail";
const AI_SETTINGS_FILE_NAME = "ai-settings.json";

export type MailAssistantSecrets = Partial<
  Record<MailAssistantProvider, string | null>
>;

export async function loadPersistedMailAssistantSettings(): Promise<MailAssistantSettings | null> {
  try {
    const raw = await fs.readFile(getAiSettingsPath(), "utf8");
    const parsed = JSON.parse(raw) as MailAssistantSettingsSeed;
    return mergeMailAssistantSettings(parsed);
  } catch {
    return null;
  }
}

export async function savePersistedMailAssistantSettings(
  settings: MailAssistantSettings
): Promise<void> {
  const filePath = getAiSettingsPath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(settings, null, 2), "utf8");
}

export async function loadPersistedMailAssistantSecrets(): Promise<MailAssistantSecrets> {
  const secrets: MailAssistantSecrets = {};

  for (const provider of ["openai", "anthropic"] as const) {
    const value = await keytar.getPassword(
      SERVICE_NAME,
      getProviderSecretKey(provider)
    );
    secrets[provider] = value?.trim() ? value.trim() : null;
  }

  return secrets;
}

export async function savePersistedMailAssistantSecret(
  provider: MailAssistantProvider,
  value: string | null | undefined
): Promise<void> {
  if (!providerUsesApiKey(provider) || value === undefined) {
    return;
  }

  const account = getProviderSecretKey(provider);
  const normalizedValue = value?.trim() ?? "";

  if (!normalizedValue) {
    await keytar.deletePassword(SERVICE_NAME, account);
    return;
  }

  await keytar.setPassword(SERVICE_NAME, account, normalizedValue);
}

function getAiSettingsPath(): string {
  return path.join(app.getPath("userData"), AI_SETTINGS_FILE_NAME);
}

function getProviderSecretKey(
  provider: Extract<MailAssistantProvider, "openai" | "anthropic">
): string {
  return `ai-${provider}-api-key`;
}
