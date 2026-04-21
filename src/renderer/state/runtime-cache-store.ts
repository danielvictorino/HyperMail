import { create } from "zustand";

export type RuntimeCacheStatus =
  | "idle"
  | "registering"
  | "ready"
  | "bundled"
  | "unsupported"
  | "error";

interface RuntimeCacheState {
  status: RuntimeCacheStatus;
  detail: string;
  itemCount: number;
  cacheName: string | null;
  setStatus: (
    status: RuntimeCacheStatus,
    detail: string,
    cacheName?: string | null,
    itemCount?: number
  ) => void;
}

export const useRuntimeCacheStore = create<RuntimeCacheState>((set) => ({
  status: "idle",
  detail: "Runtime asset cache has not been initialized yet.",
  itemCount: 0,
  cacheName: null,
  setStatus: (status, detail, cacheName = null, itemCount = 0) =>
    set({
      status,
      detail,
      cacheName,
      itemCount
    })
}));
