import path from "node:path";
import {
  app,
  crashReporter,
  shell,
  type BrowserWindow,
  type WebContents
} from "electron";
import log from "electron-log/main";
import type { ReleaseDiagnosticsSummary } from "../../src/shared/contracts";

let initialized = false;
let diagnosticsSummary: ReleaseDiagnosticsSummary | null = null;

function getLogsDirectory(): string {
  return path.join(app.getPath("userData"), "logs");
}

function getMainLogPath(): string {
  return path.join(getLogsDirectory(), "main.log");
}

function getCrashDumpsDirectory(): string {
  return path.join(app.getPath("userData"), "crash-dumps");
}

function getCrashReportUploadUrl(): string | null {
  return process.env.HYPERMAIL_CRASH_REPORT_URL?.trim() || null;
}

function buildDiagnosticsSummary(): ReleaseDiagnosticsSummary {
  return {
    logsDirectory: getLogsDirectory(),
    mainLogPath: getMainLogPath(),
    crashDumpsDirectory: getCrashDumpsDirectory(),
    crashReporterEnabled: initialized,
    crashReportUploadUrl: getCrashReportUploadUrl(),
    updateFeedUrl: process.env.HYPERMAIL_UPDATES_URL?.trim() || null
  };
}

export function initializeAppObservability(): ReleaseDiagnosticsSummary {
  if (initialized) {
    return getReleaseDiagnosticsSummary();
  }

  const logsDirectory = getLogsDirectory();
  const crashDumpsDirectory = getCrashDumpsDirectory();
  const crashReportUploadUrl = getCrashReportUploadUrl();

  app.setAppLogsPath(logsDirectory);
  app.setPath("crashDumps", crashDumpsDirectory);

  log.transports.file.resolvePathFn = () => getMainLogPath();
  log.transports.file.level = "info";
  log.transports.console.level = app.isPackaged ? "warn" : "debug";

  crashReporter.start({
    productName: "HyperMail",
    uploadToServer: Boolean(crashReportUploadUrl),
    submitURL: crashReportUploadUrl ?? ""
  });

  process.on("uncaughtException", (error) => {
    log.error("[main] uncaughtException", error);
  });

  process.on("unhandledRejection", (reason) => {
    log.error("[main] unhandledRejection", reason);
  });

  initialized = true;
  diagnosticsSummary = buildDiagnosticsSummary();

  log.info("HyperMail observability ready", diagnosticsSummary);

  return diagnosticsSummary;
}

export function getReleaseDiagnosticsSummary(): ReleaseDiagnosticsSummary {
  diagnosticsSummary ??= buildDiagnosticsSummary();
  return diagnosticsSummary;
}

export function attachWindowObservability(window: BrowserWindow): void {
  const contents = window.webContents;

  contents.on("render-process-gone", (_event, details) => {
    log.error("[renderer] render-process-gone", {
      reason: details.reason,
      exitCode: details.exitCode
    });
  });

  contents.on(
    "did-fail-load",
    (_event, errorCode, errorDescription, validatedUrl) => {
      log.error("[renderer] did-fail-load", {
        errorCode,
        errorDescription,
        validatedUrl
      });
    }
  );

  window.on("unresponsive", () => {
    log.warn("[window] unresponsive");
  });

  window.on("responsive", () => {
    log.info("[window] responsive");
  });
}

export function reportRendererError(payload: {
  kind: "error" | "unhandledrejection";
  message: string;
  stack?: string;
  source?: string;
  line?: number;
  column?: number;
}): void {
  log.error("[renderer] runtime-error", payload);
}

export async function openLogsDirectory(): Promise<void> {
  const errorMessage = await shell.openPath(getLogsDirectory());

  if (errorMessage) {
    throw new Error(errorMessage);
  }
}

export function getMainLogger(): typeof log {
  return log;
}

export function logWebContentsEvent(message: string, contents: WebContents): void {
  log.info(message, {
    id: contents.id,
    url: contents.getURL()
  });
}
