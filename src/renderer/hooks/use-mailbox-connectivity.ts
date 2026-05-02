import { useConnectivityStore } from "../state/connectivity-store";
import { useConnectivityBootstrap } from "./use-connectivity-bootstrap";

export interface MailboxConnectivityState {
  actualOnline: boolean;
  manualOffline: boolean;
  effectiveOnline: boolean;
  lastQueueError: string | null;
  toggleManualOffline: () => void;
}

export function useMailboxConnectivity(): MailboxConnectivityState {
  useConnectivityBootstrap();

  const actualOnline = useConnectivityStore((state) => state.actualOnline);
  const manualOffline = useConnectivityStore((state) => state.manualOffline);
  const lastQueueError = useConnectivityStore((state) => state.lastQueueError);
  const toggleManualOffline = useConnectivityStore(
    (state) => state.toggleManualOffline
  );

  return {
    actualOnline,
    manualOffline,
    effectiveOnline: actualOnline && !manualOffline,
    lastQueueError,
    toggleManualOffline
  };
}
