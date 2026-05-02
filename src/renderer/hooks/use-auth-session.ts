import { useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type {
  AutoUpdateStatus,
  AuthSessionSummary,
  DesktopPlatform,
  ReleaseDiagnosticsSummary,
  RuntimeConfigSummary
} from "@shared/contracts";
import { getDesktopApi } from "../lib/desktop-api";
import { queryClient } from "../lib/query-client";
import { deleteAccountCascade, hypermailDb } from "../offline/db/hypermail-db";
import { useSessionStore } from "../state/session-store";
import { buildAccountDescriptor } from "./use-mailbox-account";

const SESSION_QUERY_KEY = ["hypermail", "auth-session"] as const;

export function useAuthSession() {
  const status = useSessionStore((state) => state.status);
  const session = useSessionStore((state) => state.session);
  const error = useSessionStore((state) => state.error);
  const platform = useSessionStore((state) => state.platform);
  const appVersion = useSessionStore((state) => state.appVersion);
  const runtimeConfig = useSessionStore((state) => state.runtimeConfig);
  const releaseDiagnostics = useSessionStore((state) => state.releaseDiagnostics);
  const autoUpdateStatus = useSessionStore((state) => state.autoUpdateStatus);
  const hydrateSession = useSessionStore((state) => state.hydrateSession);
  const setConnecting = useSessionStore((state) => state.setConnecting);
  const setError = useSessionStore((state) => state.setError);
  const setShellContext = useSessionStore((state) => state.setShellContext);
  const setAutoUpdateStatus = useSessionStore((state) => state.setAutoUpdateStatus);
  const clearSession = useSessionStore((state) => state.clearSession);

  const shellQuery = useQuery({
    queryKey: ["hypermail", "shell-context"],
    queryFn: async () => {
      const api = getDesktopApi();
      const [
        releaseDiagnostics,
        autoUpdateStatus,
        platform,
        appVersion,
        runtimeConfig
      ] = await Promise.all([
        api.shell.getReleaseDiagnostics(),
        api.shell.getAutoUpdateStatus(),
        api.shell.getPlatform(),
        api.shell.getAppVersion(),
        api.shell.getRuntimeConfigSummary()
      ]);

      return {
        releaseDiagnostics,
        autoUpdateStatus,
        platform,
        appVersion,
        runtimeConfig
      };
    }
  });

  const sessionQuery = useQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: async () => getDesktopApi().auth.getSession()
  });

  useEffect(() => {
    if (shellQuery.data) {
      setShellContext(
        shellQuery.data.platform as DesktopPlatform,
        shellQuery.data.appVersion,
        shellQuery.data.runtimeConfig as RuntimeConfigSummary,
        shellQuery.data.releaseDiagnostics as ReleaseDiagnosticsSummary,
        shellQuery.data.autoUpdateStatus as AutoUpdateStatus
      );
    }
  }, [setShellContext, shellQuery.data]);

  useEffect(() => {
    if (shellQuery.isError) {
      setError(
        shellQuery.error instanceof Error
          ? shellQuery.error.message
          : "HyperMail could not load the shell context."
      );
    }
  }, [setError, shellQuery.error, shellQuery.isError]);

  useEffect(() => {
    const api = getDesktopApi();
    return api.shell.onAutoUpdateStatus((status) => {
      setAutoUpdateStatus(status);
    });
  }, [setAutoUpdateStatus]);

  useEffect(() => {
    if (sessionQuery.isSuccess) {
      hydrateSession(sessionQuery.data ?? null);
    } else if (sessionQuery.isError) {
      const errorMessage =
        sessionQuery.error instanceof Error
          ? sessionQuery.error.message
          : "HyperMail could not restore your session.";
      setError(errorMessage);
    }
  }, [
    hydrateSession,
    setError,
    sessionQuery.data,
    sessionQuery.error,
    sessionQuery.isError,
    sessionQuery.isSuccess
  ]);

  const signInMutation = useMutation({
    mutationFn: async (provider: "google" | "microsoft") => {
      setConnecting();
      return provider === "google"
        ? getDesktopApi().auth.signInWithGoogle()
        : getDesktopApi().auth.signInWithMicrosoft();
    },
    onSuccess: (session: AuthSessionSummary) => {
      queryClient.setQueryData(SESSION_QUERY_KEY, session);
      hydrateSession(session);
    },
    onError: (error) => {
      setError(
        error instanceof Error
          ? error.message
          : "HyperMail could not connect this account."
      );
    }
  });

  const signOutMutation = useMutation({
    mutationFn: async () => {
      const sessionToPurge = session;

      await getDesktopApi().auth.signOut();

      if (sessionToPurge) {
        await deleteAccountCascade(
          hypermailDb,
          buildAccountDescriptor(sessionToPurge).id
        );
      }
    },
    onSuccess: () => {
      queryClient.setQueryData(SESSION_QUERY_KEY, null);
      clearSession();
    },
    onError: (error) => {
      setError(
        error instanceof Error ? error.message : "HyperMail could not sign out."
      );
    }
  });

  const checkForUpdatesMutation = useMutation({
    mutationFn: async () => getDesktopApi().shell.checkForUpdates(),
    onSuccess: (status) => {
      setAutoUpdateStatus(status);
    },
    onError: (error) => {
      setError(
        error instanceof Error
          ? error.message
          : "HyperMail could not check for updates."
      );
    }
  });

  const downloadUpdateMutation = useMutation({
    mutationFn: async () => getDesktopApi().shell.downloadUpdate(),
    onSuccess: (status) => {
      setAutoUpdateStatus(status);
    },
    onError: (error) => {
      setError(
        error instanceof Error
          ? error.message
          : "HyperMail could not download the update."
      );
    }
  });

  const installUpdateMutation = useMutation({
    mutationFn: async () => getDesktopApi().shell.installDownloadedUpdate(),
    onError: (error) => {
      setError(
        error instanceof Error
          ? error.message
          : "HyperMail could not install the downloaded update."
      );
    }
  });

  const openLogsMutation = useMutation({
    mutationFn: async () => getDesktopApi().shell.openLogsDirectory(),
    onError: (error) => {
      setError(
        error instanceof Error
          ? error.message
          : "HyperMail could not open the logs directory."
      );
    }
  });

  return {
    status,
    session,
    error,
    platform,
    appVersion,
    runtimeConfig,
    releaseDiagnostics,
    autoUpdateStatus,
    isBootstrapping: sessionQuery.isLoading || shellQuery.isLoading,
    connectGoogle: () => signInMutation.mutateAsync("google"),
    connectMicrosoft: () => signInMutation.mutateAsync("microsoft"),
    disconnectGoogle: () => signOutMutation.mutateAsync(),
    checkForUpdates: () => checkForUpdatesMutation.mutateAsync(),
    downloadUpdate: () => downloadUpdateMutation.mutateAsync(),
    installDownloadedUpdate: () => installUpdateMutation.mutateAsync(),
    openLogsDirectory: () => openLogsMutation.mutateAsync(),
    isMutating:
      signInMutation.isPending ||
      signOutMutation.isPending ||
      checkForUpdatesMutation.isPending ||
      downloadUpdateMutation.isPending ||
      installUpdateMutation.isPending ||
      openLogsMutation.isPending
  };
}
