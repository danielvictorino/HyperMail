import { useEffect, useRef } from "react";
import {
  dispatchKeyboardEvent,
  type KeyboardDispatchOptions
} from "../lib/keyboard-dispatch";

export type KeyboardEngineOptions = KeyboardDispatchOptions;

export function useKeyboardEngine(options: KeyboardEngineOptions): void {
  const optionsRef = useRef(options);

  useEffect(() => {
    optionsRef.current = options;
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      void dispatchKeyboardEvent(event, optionsRef.current);
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);
}
