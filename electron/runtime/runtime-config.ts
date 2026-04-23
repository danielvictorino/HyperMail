import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { app } from "electron";
import type { RuntimeConfigSummary } from "../../src/shared/contracts";
import {
  buildRuntimeConfigSearchPaths,
  getPreferredRuntimeConfigPath
} from "../../src/shared/runtime/runtime-config-paths";

let cachedSummary: RuntimeConfigSummary | null = null;

function buildPathOptions() {
  return {
    explicitPath: process.env.HYPERMAIL_CONFIG_PATH ?? null,
    cwd: process.cwd(),
    userDataPath: app.getPath("userData"),
    appPath: app.getAppPath(),
    execDir: path.dirname(process.execPath),
    resourcesPath: process.resourcesPath,
    packaged: app.isPackaged
  };
}

function createSummary(loadedConfigPath: string | null): RuntimeConfigSummary {
  const pathOptions = buildPathOptions();

  return {
    packaged: pathOptions.packaged,
    preferredConfigPath: getPreferredRuntimeConfigPath(pathOptions),
    loadedConfigPath,
    searchPaths: buildRuntimeConfigSearchPaths(pathOptions),
    googleOAuthReady: Boolean(process.env.GOOGLE_OAUTH_CLIENT_ID?.trim()),
    microsoftOAuthReady: Boolean(process.env.MICROSOFT_OAUTH_CLIENT_ID?.trim()),
    openAiReady: Boolean(process.env.OPENAI_API_KEY?.trim()),
    anthropicReady: Boolean(process.env.ANTHROPIC_API_KEY?.trim()),
    ollamaReady: Boolean(process.env.OLLAMA_MODEL?.trim()),
    updatesUrlConfigured: Boolean(process.env.HYPERMAIL_UPDATES_URL?.trim()),
    crashReportUploadConfigured: Boolean(process.env.HYPERMAIL_CRASH_REPORT_URL?.trim())
  };
}

export function loadRuntimeConfig(): RuntimeConfigSummary {
  if (cachedSummary) {
    return cachedSummary;
  }

  let loadedConfigPath: string | null = null;

  for (const candidate of buildRuntimeConfigSearchPaths(buildPathOptions())) {
    if (!fs.existsSync(candidate)) {
      continue;
    }

    dotenv.config({
      path: candidate,
      override: false
    });
    loadedConfigPath = candidate;
    break;
  }

  cachedSummary = createSummary(loadedConfigPath);
  return cachedSummary;
}

export function getRuntimeConfigSummary(): RuntimeConfigSummary {
  return cachedSummary ?? loadRuntimeConfig();
}

export function formatMissingRuntimeConfigMessage(key: string): string {
  const summary = getRuntimeConfigSummary();
  const preferredLocation = summary.preferredConfigPath;

  if (summary.loadedConfigPath) {
    return `Missing ${key}. Add it to ${summary.loadedConfigPath} or ${preferredLocation}, then restart HyperMail.`;
  }

  return `Missing ${key}. Create ${preferredLocation} and add it there, then restart HyperMail.`;
}
