import { useEffect, useEffectEvent } from "react";
import {
  dispatchKeyboardEvent,
  type KeyboardDispatchOptions
} from "../lib/keyboard-dispatch";

export type KeyboardEngineOptions = KeyboardDispatchOptions;

export function useKeyboardEngine(options: KeyboardEngineOptions): void {
  const onKeyDown = useEffectEvent(async (event: KeyboardEvent) => {
    await dispatchKeyboardEvent(event, options);
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      void onKeyDown(event);
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onKeyDown]);
}
