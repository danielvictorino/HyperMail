import fs from "node:fs";
import path from "node:path";
import { app, BrowserWindow, ipcMain, nativeTheme, session, shell } from "electron";
import { buildContentSecurityPolicy } from "../src/shared/content-security-policy";
import {
  cachedAttachmentPayloadSchema,
  downloadGmailAttachmentRequestSchema,
  generateDraftReplyRequestSchema,
  gmailMailboxSyncRequestSchema,
  isAllowedExternalUrl,
  listOllamaModelsRequestSchema,
  parseIpcPayload,
  rendererErrorPayloadSchema,
  saveMailAssistantSettingsRequestSchema,
  sendDraftRequestSchema,
  setThreadArchivedRequestSchema,
  setThreadStarredRequestSchema,
  suggestSplitRequestSchema,
  summarizeThreadRequestSchema,
  testMailAssistantProviderConnectionRequestSchema,
  unsubscribeThreadRequestSchema
} from "../src/shared/ipc-contracts";
import {
  generateDraftReply,
  getMailAssistantSettings,
  getMailAssistantRuntimeConfig,
  listOllamaModels,
  saveMailAssistantSettings,
  suggestSplit,
  summarizeThread,
  testMailAssistantProviderConnection
} from "./ai/mail-assistant-service";
import {
  downloadGmailAttachment,
  persistThreadArchivedState,
  persistThreadStarredState,
  sendGmailDraft,
  syncGmailMailbox,
  unsubscribeGmailThread
} from "./gmail/google-mail-service";
import { saveCachedAttachmentToDisk } from "./mail/attachment-export";
import {
  getStoredGoogleSession,
  signInWithGoogle,
  signOutFromGoogle
} from "./oauth/google-oauth";
import {
  getStoredMicrosoftSession,
  signInWithMicrosoft,
  signOutFromMicrosoft
} from "./oauth/microsoft-oauth";
import { loadLatestStoredSession } from "./oauth/token-store";
import {
  formatMissingRuntimeConfigMessage,
  getRuntimeConfigSummary,
  loadRuntimeConfig
} from "./runtime/runtime-config";
import {
  attachWindowObservability,
  getReleaseDiagnosticsSummary,
  initializeAppObservability,
  openLogsDirectory,
  reportRendererError
} from "./observability/app-observability";
import {
  checkForUpdates,
  downloadUpdate,
  getAutoUpdateStatus,
  initializeAutoUpdate,
  installDownloadedUpdate
} from "./updater/auto-update-service";
import { isAllowedDevServerNavigation } from "../src/shared/security/url-safety";

let mainWindow: BrowserWindow | null = null;

function installContentSecurityPolicy(): void {
  const policy = buildContentSecurityPolicy({
    devServerUrl: process.env.VITE_DEV_SERVER_URL
  });
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [policy]
      }
    });
  });
}

function resolveWindowIconPath(): string | undefined {
  const candidates = app.isPackaged
    ? [
        path.join(app.getAppPath(), "dist", "icon.png"),
        path.join(process.resourcesPath, "app.asar", "dist", "icon.png")
      ]
    : [
        path.join(app.getAppPath(), "public", "icon.png"),
        path.join(process.cwd(), "public", "icon.png")
      ];

  return candidates.find((candidate) => fs.existsSync(candidate));
}

function assertGoogleClientId(): string {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim();

  if (!clientId) {
    throw new Error(formatMissingRuntimeConfigMessage("GOOGLE_OAUTH_CLIENT_ID"));
  }

  return clientId;
}

function assertMicrosoftClientId(): string {
  const clientId = process.env.MICROSOFT_OAUTH_CLIENT_ID?.trim();

  if (!clientId) {
    throw new Error(formatMissingRuntimeConfigMessage("MICROSOFT_OAUTH_CLIENT_ID"));
  }

  return clientId;
}

async function createMainWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1500,
    height: 960,
    minWidth: 1180,
    minHeight: 760,
    icon: resolveWindowIconPath(),
    backgroundColor: "#09090b",
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      backgroundThrottling: false
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedExternalUrl(url)) {
      void shell.openExternal(url);
    }
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    const devServerUrl = process.env.VITE_DEV_SERVER_URL;
    if (devServerUrl && isAllowedDevServerNavigation(url, devServerUrl)) {
      return;
    }
    event.preventDefault();
    if (isAllowedExternalUrl(url)) {
      void shell.openExternal(url);
    }
  });
  attachWindowObservability(mainWindow);

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;

  if (devServerUrl) {
    await mainWindow.loadURL(devServerUrl);
  } else {
    await mainWindow.loadFile(path.join(app.getAppPath(), "dist", "index.html"));
  }

  if (!mainWindow.isVisible()) {
    mainWindow.show();
  }
}

function registerIpcHandlers(): void {
  ipcMain.handle("auth:get-session", async () => {
    try {
      const latestSession = await loadLatestStoredSession();

      if (!latestSession) {
        return null;
      }

      if (latestSession.summary.provider === "google") {
        return await getStoredGoogleSession(assertGoogleClientId());
      }

      return await getStoredMicrosoftSession(assertMicrosoftClientId());
    } catch (error) {
      throw normalizeError(error);
    }
  });

  ipcMain.handle("auth:sign-in-google", async () => {
    try {
      return await signInWithGoogle(assertGoogleClientId());
    } catch (error) {
      throw normalizeError(error);
    }
  });

  ipcMain.handle("auth:sign-in-microsoft", async () => {
    try {
      return await signInWithMicrosoft(assertMicrosoftClientId());
    } catch (error) {
      throw normalizeError(error);
    }
  });

  ipcMain.handle("auth:sign-out", async () => {
    try {
      await Promise.all([signOutFromGoogle(), signOutFromMicrosoft()]);
    } catch (error) {
      throw normalizeError(error);
    }
  });

  ipcMain.handle("mail:sync-gmail-mailbox", async (_event, input) => {
    try {
      const parsed = parseIpcPayload(
        "mail:sync-gmail-mailbox",
        gmailMailboxSyncRequestSchema,
        input
      );
      return await syncGmailMailbox(assertGoogleClientId(), parsed);
    } catch (error) {
      throw normalizeError(error);
    }
  });

  ipcMain.handle("mail:set-thread-starred", async (_event, input) => {
    try {
      const parsed = parseIpcPayload(
        "mail:set-thread-starred",
        setThreadStarredRequestSchema,
        input
      );
      await persistThreadStarredState(assertGoogleClientId(), parsed);
    } catch (error) {
      throw normalizeError(error);
    }
  });

  ipcMain.handle("mail:set-thread-archived", async (_event, input) => {
    try {
      const parsed = parseIpcPayload(
        "mail:set-thread-archived",
        setThreadArchivedRequestSchema,
        input
      );
      await persistThreadArchivedState(assertGoogleClientId(), parsed);
    } catch (error) {
      throw normalizeError(error);
    }
  });

  ipcMain.handle("mail:unsubscribe-gmail-thread", async (_event, input) => {
    try {
      const parsed = parseIpcPayload(
        "mail:unsubscribe-gmail-thread",
        unsubscribeThreadRequestSchema,
        input
      );
      await unsubscribeGmailThread(assertGoogleClientId(), parsed);
    } catch (error) {
      throw normalizeError(error);
    }
  });

  ipcMain.handle("mail:download-gmail-attachment", async (_event, input) => {
    try {
      const parsed = parseIpcPayload(
        "mail:download-gmail-attachment",
        downloadGmailAttachmentRequestSchema,
        input
      );
      return await downloadGmailAttachment(assertGoogleClientId(), parsed);
    } catch (error) {
      throw normalizeError(error);
    }
  });

  ipcMain.handle("mail:save-cached-attachment", async (_event, input) => {
    try {
      const parsed = parseIpcPayload(
        "mail:save-cached-attachment",
        cachedAttachmentPayloadSchema,
        input
      );
      return await saveCachedAttachmentToDisk(parsed, mainWindow);
    } catch (error) {
      throw normalizeError(error);
    }
  });

  ipcMain.handle("mail:send-gmail-draft", async (_event, input) => {
    try {
      const parsed = parseIpcPayload(
        "mail:send-gmail-draft",
        sendDraftRequestSchema,
        input
      );
      return await sendGmailDraft(assertGoogleClientId(), parsed);
    } catch (error) {
      throw normalizeError(error);
    }
  });

  ipcMain.handle("ai:get-settings", async () => getMailAssistantSettings());
  ipcMain.handle("ai:get-runtime-config", async () => getMailAssistantRuntimeConfig());
  ipcMain.handle("ai:save-settings", async (_event, input) => {
    try {
      const parsed = parseIpcPayload(
        "ai:save-settings",
        saveMailAssistantSettingsRequestSchema,
        input
      );
      return await saveMailAssistantSettings(parsed.settings);
    } catch (error) {
      throw normalizeError(error);
    }
  });
  ipcMain.handle("ai:test-provider-connection", async (_event, input) => {
    try {
      const parsed = parseIpcPayload(
        "ai:test-provider-connection",
        testMailAssistantProviderConnectionRequestSchema,
        input
      );
      return await testMailAssistantProviderConnection(parsed);
    } catch (error) {
      throw normalizeError(error);
    }
  });
  ipcMain.handle("ai:list-ollama-models", async (_event, input) => {
    try {
      const parsed = parseIpcPayload(
        "ai:list-ollama-models",
        listOllamaModelsRequestSchema,
        input ?? {}
      );
      return await listOllamaModels(parsed);
    } catch (error) {
      throw normalizeError(error);
    }
  });

  ipcMain.handle("ai:summarize-thread", async (_event, input) => {
    try {
      const parsed = parseIpcPayload(
        "ai:summarize-thread",
        summarizeThreadRequestSchema,
        input
      );
      return await summarizeThread(
        parsed as unknown as Parameters<typeof summarizeThread>[0]
      );
    } catch (error) {
      throw normalizeError(error);
    }
  });

  ipcMain.handle("ai:suggest-split", async (_event, input) => {
    try {
      const parsed = parseIpcPayload(
        "ai:suggest-split",
        suggestSplitRequestSchema,
        input
      );
      return await suggestSplit(
        parsed as unknown as Parameters<typeof suggestSplit>[0]
      );
    } catch (error) {
      throw normalizeError(error);
    }
  });

  ipcMain.handle("ai:generate-draft-reply", async (_event, input) => {
    try {
      const parsed = parseIpcPayload(
        "ai:generate-draft-reply",
        generateDraftReplyRequestSchema,
        input
      );
      return await generateDraftReply(
        parsed as unknown as Parameters<typeof generateDraftReply>[0]
      );
    } catch (error) {
      throw normalizeError(error);
    }
  });

  ipcMain.handle("shell:get-app-version", async () => app.getVersion());
  ipcMain.handle("shell:get-platform", async () => process.platform);
  ipcMain.handle("shell:get-runtime-config-summary", async () =>
    getRuntimeConfigSummary()
  );
  ipcMain.handle("shell:get-release-diagnostics", async () =>
    getReleaseDiagnosticsSummary()
  );
  ipcMain.handle("shell:get-auto-update-status", async () => getAutoUpdateStatus());
  ipcMain.handle("shell:check-for-updates", async () => {
    try {
      return await checkForUpdates();
    } catch (error) {
      throw normalizeError(error);
    }
  });
  ipcMain.handle("shell:download-update", async () => {
    try {
      return await downloadUpdate();
    } catch (error) {
      throw normalizeError(error);
    }
  });
  ipcMain.handle("shell:install-downloaded-update", async () => {
    try {
      await installDownloadedUpdate();
    } catch (error) {
      throw normalizeError(error);
    }
  });
  ipcMain.handle("shell:open-logs-directory", async () => {
    try {
      await openLogsDirectory();
    } catch (error) {
      throw normalizeError(error);
    }
  });
  ipcMain.on("shell:renderer-error", (_event, payload) => {
    const result = rendererErrorPayloadSchema.safeParse(payload);
    if (result.success) {
      reportRendererError(result.data);
    }
  });
}

function normalizeError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  return new Error("Unknown HyperMail runtime error.");
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    await createMainWindow();
  }
});

app.whenReady().then(async () => {
  app.setName("HyperMail");
  if (process.platform === "win32") {
    app.setAppUserModelId("com.hypermail.desktop");
  }
  nativeTheme.themeSource = "dark";
  loadRuntimeConfig();
  initializeAppObservability();
  initializeAutoUpdate();
  installContentSecurityPolicy();
  registerIpcHandlers();
  await createMainWindow();
});
