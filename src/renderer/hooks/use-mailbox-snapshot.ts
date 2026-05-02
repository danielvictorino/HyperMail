import { liveQuery } from "dexie";
import { useEffect, useState } from "react";
import type { InboxSnapshot, MailAccountDescriptor } from "@shared/mail/models";
import { ensureSeededMailbox } from "../offline/demo/seed-mailbox";
import { loadInboxSnapshot } from "../offline/db/load-inbox-snapshot";
import { startOfflineRuntime } from "../offline/runtime";

export interface MailboxSnapshotState {
  snapshot: InboxSnapshot | null;
  isLoading: boolean;
  error: string | null;
}

export function useMailboxSnapshot(
  account: MailAccountDescriptor
): MailboxSnapshotState {
  const [snapshot, setSnapshot] = useState<InboxSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    startOfflineRuntime();

    let cancelled = false;
    let subscription: { unsubscribe: () => void } | null = null;

    setIsLoading(true);
    setError(null);

    void (async () => {
      try {
        await ensureSeededMailbox(account);

        if (cancelled) {
          return;
        }

        subscription = liveQuery(() => loadInboxSnapshot(account.id)).subscribe({
          next: (nextSnapshot) => {
            setSnapshot(nextSnapshot);
            setIsLoading(false);
          },
          error: (liveQueryError) => {
            setError(
              liveQueryError instanceof Error
                ? liveQueryError.message
                : "HyperMail could not read the local mailbox."
            );
            setIsLoading(false);
          }
        });
      } catch (seedError) {
        setError(
          seedError instanceof Error
            ? seedError.message
            : "HyperMail could not seed the local mailbox."
        );
        setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, [account]);

  return { snapshot, isLoading, error };
}
