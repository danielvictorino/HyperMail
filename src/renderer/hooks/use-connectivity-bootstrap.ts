import { useEffect } from "react";
import { useConnectivityStore } from "../state/connectivity-store";

export function useConnectivityBootstrap(): void {
  const setActualOnline = useConnectivityStore((state) => state.setActualOnline);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const update = () => setActualOnline(window.navigator.onLine);

    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);

    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, [setActualOnline]);
}
