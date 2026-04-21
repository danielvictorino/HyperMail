import { create } from "zustand";

const MANUAL_OFFLINE_STORAGE_KEY = "hypermail.manual-offline";

function readManualOfflineFlag(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(MANUAL_OFFLINE_STORAGE_KEY) === "true";
}

interface ConnectivityState {
  actualOnline: boolean;
  manualOffline: boolean;
  lastQueueError: string | null;
  setActualOnline: (online: boolean) => void;
  toggleManualOffline: () => void;
  setQueueError: (message: string | null) => void;
}

export const useConnectivityStore = create<ConnectivityState>((set, get) => ({
  actualOnline: typeof navigator === "undefined" ? true : navigator.onLine,
  manualOffline: readManualOfflineFlag(),
  lastQueueError: null,
  setActualOnline: (online) => set({ actualOnline: online }),
  toggleManualOffline: () => {
    const nextValue = !get().manualOffline;

    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        MANUAL_OFFLINE_STORAGE_KEY,
        String(nextValue)
      );
    }

    set({ manualOffline: nextValue });
  },
  setQueueError: (message) => set({ lastQueueError: message })
}));

export function getEffectiveOnline(): boolean {
  const state = useConnectivityStore.getState();
  return state.actualOnline && !state.manualOffline;
}
