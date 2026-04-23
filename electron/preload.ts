import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";
import type { HypermailDesktopApi } from "../src/shared/contracts";

const desktopApi: HypermailDesktopApi = {
  auth: {
    getSession: () => ipcRenderer.invoke("auth:get-session"),
    signInWithGoogle: () => ipcRenderer.invoke("auth:sign-in-google"),
    signInWithMicrosoft: () => ipcRenderer.invoke("auth:sign-in-microsoft"),
    signOut: () => ipcRenderer.invoke("auth:sign-out")
  },
  ai: {
    getSettings: () => ipcRenderer.invoke("ai:get-settings"),
    getRuntimeConfig: () => ipcRenderer.invoke("ai:get-runtime-config"),
    saveSettings: (input) => ipcRenderer.invoke("ai:save-settings", input),
    testProviderConnection: (input) =>
      ipcRenderer.invoke("ai:test-provider-connection", input),
    listOllamaModels: (input) => ipcRenderer.invoke("ai:list-ollama-models", input),
    summarizeThread: (input) => ipcRenderer.invoke("ai:summarize-thread", input),
    suggestSplit: (input) => ipcRenderer.invoke("ai:suggest-split", input),
    generateDraftReply: (input) => ipcRenderer.invoke("ai:generate-draft-reply", input)
  },
  mail: {
    syncGmailMailbox: (input) => ipcRenderer.invoke("mail:sync-gmail-mailbox", input),
    setThreadStarred: (input) => ipcRenderer.invoke("mail:set-thread-starred", input),
    setThreadArchived: (input) => ipcRenderer.invoke("mail:set-thread-archived", input),
    unsubscribeGmailThread: (input) =>
      ipcRenderer.invoke("mail:unsubscribe-gmail-thread", input),
    downloadGmailAttachment: (input) =>
      ipcRenderer.invoke("mail:download-gmail-attachment", input),
    saveCachedAttachment: (input) =>
      ipcRenderer.invoke("mail:save-cached-attachment", input),
    sendGmailDraft: (input) => ipcRenderer.invoke("mail:send-gmail-draft", input)
  },
  shell: {
    getAppVersion: () => ipcRenderer.invoke("shell:get-app-version"),
    getPlatform: () => ipcRenderer.invoke("shell:get-platform"),
    getRuntimeConfigSummary: () =>
      ipcRenderer.invoke("shell:get-runtime-config-summary"),
    getReleaseDiagnostics: () => ipcRenderer.invoke("shell:get-release-diagnostics"),
    getAutoUpdateStatus: () => ipcRenderer.invoke("shell:get-auto-update-status"),
    checkForUpdates: () => ipcRenderer.invoke("shell:check-for-updates"),
    downloadUpdate: () => ipcRenderer.invoke("shell:download-update"),
    installDownloadedUpdate: () =>
      ipcRenderer.invoke("shell:install-downloaded-update"),
    openLogsDirectory: () => ipcRenderer.invoke("shell:open-logs-directory"),
    onAutoUpdateStatus: (listener) => {
      const subscription = (
        _event: IpcRendererEvent,
        status: Parameters<typeof listener>[0]
      ) => {
        listener(status);
      };

      ipcRenderer.on("shell:auto-update-status", subscription);

      return () => {
        ipcRenderer.removeListener("shell:auto-update-status", subscription);
      };
    }
  }
};

contextBridge.exposeInMainWorld("hypermail", desktopApi);

window.addEventListener("error", (event) => {
  ipcRenderer.send("shell:renderer-error", {
    kind: "error",
    message: event.message,
    stack: event.error instanceof Error ? event.error.stack : undefined,
    source: event.filename,
    line: event.lineno,
    column: event.colno
  });
});

window.addEventListener("unhandledrejection", (event) => {
  const reason =
    event.reason instanceof Error
      ? {
          message: event.reason.message,
          stack: event.reason.stack
        }
      : {
          message:
            typeof event.reason === "string"
              ? event.reason
              : "Renderer promise rejected without an Error.",
          stack: undefined
        };

  ipcRenderer.send("shell:renderer-error", {
    kind: "unhandledrejection",
    message: reason.message,
    stack: reason.stack
  });
});
