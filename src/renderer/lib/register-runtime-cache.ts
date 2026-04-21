import { useRuntimeCacheStore } from "../state/runtime-cache-store";

interface RuntimeCacheStatusPayload {
  cacheName: string;
  itemCount: number;
}

let registrationStarted = false;

export function registerRuntimeCache(): void {
  if (registrationStarted || typeof window === "undefined") {
    return;
  }

  registrationStarted = true;
  const setStatus = useRuntimeCacheStore.getState().setStatus;

  if (window.location.protocol === "file:") {
    setStatus(
      "bundled",
      "Renderer assets are already local in the packaged desktop shell."
    );
    return;
  }

  if (!("serviceWorker" in navigator)) {
    setStatus("unsupported", "Service workers are unavailable in this renderer.");
    return;
  }

  setStatus("registering", "Registering the runtime asset cache...");

  navigator.serviceWorker.addEventListener("message", (event: MessageEvent) => {
    if (event.data?.type !== "HYPERMAIL_CACHE_STATUS") {
      return;
    }

    const payload = event.data.payload as RuntimeCacheStatusPayload;
    setStatus(
      "ready",
      "Runtime assets are cached for reconnects and refreshes.",
      payload.cacheName,
      payload.itemCount
    );
  });

  void navigator.serviceWorker
    .register("/hypermail-sw.js")
    .then(async (registration) => {
      const worker =
        registration.active ??
        registration.installing ??
        registration.waiting;

      if (worker) {
        worker.postMessage({ type: "HYPERMAIL_CACHE_STATUS" });
      } else {
        setStatus("ready", "Runtime asset cache registered.");
      }
    })
    .catch((error: unknown) => {
      setStatus(
        "error",
        error instanceof Error
          ? error.message
          : "HyperMail could not register the runtime asset cache."
      );
    });
}
