import { useEffect, useState } from "react";
import type { AuthSessionSummary } from "@shared/contracts";
import type { MailAccountDescriptor } from "@shared/mail/models";
import { modifierQueueEngine, outboxEngine } from "../offline/runtime";
import {
  getGmailSyncTelemetry,
  getLastGmailSyncedAt,
  type GmailSyncTelemetry,
  syncGmailAccount
} from "../offline/sync/gmail-sync";

export interface MailboxSyncState {
  syncError: string | null;
  isRemoteSyncing: boolean;
  lastSyncedAt: number | null;
  syncTelemetry: GmailSyncTelemetry | null;
  syncRemote: () => Promise<void>;
  refreshQueue: () => Promise<void>;
}

interface UseMailboxSyncStateOptions {
  account: MailAccountDescriptor;
  session: AuthSessionSummary | null;
  effectiveOnline: boolean;
}

export function useMailboxSyncState({
  account,
  session,
  effectiveOnline
}: UseMailboxSyncStateOptions): MailboxSyncState {
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isRemoteSyncing, setIsRemoteSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [syncTelemetry, setSyncTelemetry] = useState<GmailSyncTelemetry | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!session || session.provider !== "google") {
      setLastSyncedAt(null);
      setSyncTelemetry(null);
      setSyncError(null);
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      const storedSyncedAt = await getLastGmailSyncedAt(account.id);
      const telemetry = await getGmailSyncTelemetry(account.id);

      if (!cancelled) {
        setLastSyncedAt(storedSyncedAt);
        setSyncTelemetry(telemetry);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [account.id, session]);

  useEffect(() => {
    if (!session || session.provider !== "google" || !effectiveOnline) {
      setIsRemoteSyncing(false);
      return;
    }

    let cancelled = false;
    let syncInFlight = false;
    const intervalHandle = globalThis.setInterval(() => {
      void runRemoteSync();
    }, 45_000);

    async function runRemoteSync(): Promise<void> {
      if (syncInFlight) {
        return;
      }

      syncInFlight = true;
      setIsRemoteSyncing(true);

      try {
        const payload = await syncGmailAccount(account.id);
        const telemetry = await getGmailSyncTelemetry(account.id);

        if (!cancelled) {
          setLastSyncedAt(payload.syncedAt);
          setSyncTelemetry(telemetry);
          setSyncError(null);
        }
      } catch (syncFailure) {
        if (!cancelled) {
          setSyncError(
            syncFailure instanceof Error
              ? syncFailure.message
              : "HyperMail could not sync Gmail into the local cache."
          );
        }
      } finally {
        syncInFlight = false;

        if (!cancelled) {
          setIsRemoteSyncing(false);
        }
      }
    }

    void runRemoteSync();

    return () => {
      cancelled = true;
      clearInterval(intervalHandle);
    };
  }, [account.id, effectiveOnline, session]);

  async function syncRemote(): Promise<void> {
    if (!session || session.provider !== "google" || !effectiveOnline) {
      return;
    }

    setIsRemoteSyncing(true);

    try {
      const payload = await syncGmailAccount(account.id);
      const telemetry = await getGmailSyncTelemetry(account.id);
      setLastSyncedAt(payload.syncedAt);
      setSyncTelemetry(telemetry);
      setSyncError(null);
    } catch (syncFailure) {
      const message =
        syncFailure instanceof Error
          ? syncFailure.message
          : "HyperMail could not sync Gmail into the local cache.";
      setSyncError(message);
      throw syncFailure;
    } finally {
      setIsRemoteSyncing(false);
    }
  }

  async function refreshQueue(): Promise<void> {
    await modifierQueueEngine.kick();
    await outboxEngine.kick();
    try {
      await syncRemote();
    } catch {
      // The error is already stored in mailbox state for the UI.
    }
  }

  return {
    syncError,
    isRemoteSyncing,
    lastSyncedAt,
    syncTelemetry,
    syncRemote,
    refreshQueue
  };
}
