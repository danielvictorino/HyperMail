import { app, BrowserWindow } from "electron";
import {
  NsisUpdater,
  type AppUpdater,
  type ProgressInfo,
  type UpdateDownloadedEvent,
  type UpdateInfo
} from "electron-updater";
import type { AutoUpdateStatus } from "../../src/shared/contracts";
import { getMainLogger } from "../observability/app-observability";

let updater: AppUpdater | null = null;
let autoCheckScheduled = false;
let currentStatus: AutoUpdateStatus = {
  enabled: false,
  phase: "disabled",
  currentVersion: app.getVersion(),
  availableVersion: null,
  downloadedVersion: null,
  progressPercent: null,
  provider: null,
  channel: null,
  configuredUrl: null,
  lastCheckedAt: null,
  message: "Auto-update is not configured yet."
};

function getConfiguredUpdateUrl(): string | null {
  return process.env.HYPERMAIL_UPDATES_URL?.trim() || null;
}

function getConfiguredUpdateChannel(): string {
  return process.env.HYPERMAIL_UPDATE_CHANNEL?.trim() || "latest";
}

function broadcastStatus(status: AutoUpdateStatus): void {
  currentStatus = status;

  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) {
      window.webContents.send("shell:auto-update-status", status);
    }
  }
}

function setStatus(
  patch: Partial<AutoUpdateStatus>,
  overrideEnabled?: boolean
): AutoUpdateStatus {
  const next: AutoUpdateStatus = {
    ...currentStatus,
    ...patch
  };

  if (typeof overrideEnabled === "boolean") {
    next.enabled = overrideEnabled;
  }

  broadcastStatus(next);
  return next;
}

function createDisabledStatus(message: string): AutoUpdateStatus {
  const updateUrl = getConfiguredUpdateUrl();

  return {
    enabled: false,
    phase: "disabled",
    currentVersion: app.getVersion(),
    availableVersion: null,
    downloadedVersion: null,
    progressPercent: null,
    provider: updateUrl ? "generic" : null,
    channel: updateUrl ? getConfiguredUpdateChannel() : null,
    configuredUrl: updateUrl,
    lastCheckedAt: null,
    message
  };
}

function bindUpdaterEvents(target: AppUpdater): void {
  const log = getMainLogger();

  target.on("checking-for-update", () => {
    log.info("[updates] checking");
    setStatus({
      phase: "checking",
      lastCheckedAt: Date.now(),
      message: "Checking for updates…",
      progressPercent: null
    });
  });

  target.on("update-available", (info: UpdateInfo) => {
    log.info("[updates] available", info);
    setStatus({
      phase: "available",
      availableVersion: info.version,
      downloadedVersion: null,
      message: `HyperMail ${info.version} is available.`,
      progressPercent: null
    });
  });

  target.on("update-not-available", () => {
    log.info("[updates] not-available");
    setStatus({
      phase: "not-available",
      availableVersion: null,
      downloadedVersion: null,
      message: "You are on the latest HyperMail build.",
      progressPercent: null
    });
  });

  target.on("download-progress", (progress: ProgressInfo) => {
    setStatus({
      phase: "downloading",
      progressPercent: progress.percent,
      message: `Downloading ${progress.percent.toFixed(0)}%.`
    });
  });

  target.on("update-downloaded", (info: UpdateDownloadedEvent) => {
    log.info("[updates] downloaded", info);
    setStatus({
      phase: "downloaded",
      downloadedVersion: info.version,
      progressPercent: 100,
      message: `HyperMail ${info.version} is ready to install.`
    });
  });

  target.on("error", (error) => {
    log.error("[updates] error", error);
    setStatus({
      phase: "error",
      message:
        error instanceof Error
          ? error.message
          : "HyperMail could not complete the update check."
    });
  });
}

export function initializeAutoUpdate(): AutoUpdateStatus {
  const updateUrl = getConfiguredUpdateUrl();
  const channel = getConfiguredUpdateChannel();
  const log = getMainLogger();

  if (process.platform !== "win32") {
    currentStatus = createDisabledStatus(
      "Auto-update is only wired for the Windows NSIS build right now."
    );
    return currentStatus;
  }

  if (!app.isPackaged) {
    currentStatus = createDisabledStatus(
      "Auto-update is disabled in development builds."
    );
    return currentStatus;
  }

  if (!updateUrl) {
    currentStatus = createDisabledStatus(
      "Set HYPERMAIL_UPDATES_URL on a signed Windows build to enable packaged update checks."
    );
    return currentStatus;
  }

  if (!updater) {
    updater = new NsisUpdater({
      provider: "generic",
      url: updateUrl,
      channel
    });
    updater.logger = log;
    updater.autoDownload = false;
    updater.autoInstallOnAppQuit = true;
    bindUpdaterEvents(updater);
  }

  currentStatus = {
    enabled: true,
    phase: "idle",
    currentVersion: app.getVersion(),
    availableVersion: null,
    downloadedVersion: null,
    progressPercent: null,
    provider: "generic",
    channel,
    configuredUrl: updateUrl,
    lastCheckedAt: null,
    message: "Ready to check for updates."
  };

  if (!autoCheckScheduled) {
    autoCheckScheduled = true;
    setTimeout(() => {
      void checkForUpdates().catch((error) => {
        log.error("[updates] scheduled-check failed", error);
      });
    }, 15000);
  }

  return currentStatus;
}

export function getAutoUpdateStatus(): AutoUpdateStatus {
  return currentStatus;
}

export async function checkForUpdates(): Promise<AutoUpdateStatus> {
  if (!updater) {
    return currentStatus;
  }

  await updater.checkForUpdates();
  return currentStatus;
}

export async function downloadUpdate(): Promise<AutoUpdateStatus> {
  if (!updater) {
    return currentStatus;
  }

  await updater.downloadUpdate();
  return currentStatus;
}

export async function installDownloadedUpdate(): Promise<void> {
  if (!updater || currentStatus.phase !== "downloaded") {
    throw new Error("No downloaded update is ready to install.");
  }

  setStatus({
    message: "Restarting HyperMail to install the update."
  });

  updater.quitAndInstall();
}
