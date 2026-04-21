import { create } from "zustand";
import type {
  AutoUpdateStatus,
  AuthSessionSummary,
  DesktopPlatform,
  ReleaseDiagnosticsSummary,
  RuntimeConfigSummary
} from "@shared/contracts";

type SessionStatus = "loading" | "idle" | "connecting" | "connected" | "error";

interface SessionStore {
  status: SessionStatus;
  session: AuthSessionSummary | null;
  error: string | null;
  platform: DesktopPlatform;
  appVersion: string;
  runtimeConfig: RuntimeConfigSummary | null;
  releaseDiagnostics: ReleaseDiagnosticsSummary | null;
  autoUpdateStatus: AutoUpdateStatus | null;
  hydrateSession: (session: AuthSessionSummary | null) => void;
  setConnecting: () => void;
  setError: (error: string | null) => void;
  setShellContext: (
    platform: DesktopPlatform,
    appVersion: string,
    runtimeConfig: RuntimeConfigSummary,
    releaseDiagnostics: ReleaseDiagnosticsSummary,
    autoUpdateStatus: AutoUpdateStatus
  ) => void;
  setAutoUpdateStatus: (status: AutoUpdateStatus) => void;
  clearSession: () => void;
}

export const useSessionStore = create<SessionStore>((set) => ({
  status: "loading",
  session: null,
  error: null,
  platform: "win32",
  appVersion: "0.0.0",
  runtimeConfig: null,
  releaseDiagnostics: null,
  autoUpdateStatus: null,
  hydrateSession: (session) =>
    set({
      session,
      status: session ? "connected" : "idle",
      error: null
    }),
  setConnecting: () =>
    set({
      status: "connecting",
      error: null
    }),
  setError: (error) =>
    set({
      error,
      status: error ? "error" : "idle"
    }),
  setShellContext: (
    platform,
    appVersion,
    runtimeConfig,
    releaseDiagnostics,
    autoUpdateStatus
  ) =>
    set({
      platform,
      appVersion,
      runtimeConfig,
      releaseDiagnostics,
      autoUpdateStatus
    }),
  setAutoUpdateStatus: (autoUpdateStatus) =>
    set({
      autoUpdateStatus
    }),
  clearSession: () =>
    set({
      session: null,
      status: "idle",
      error: null
    })
}));
