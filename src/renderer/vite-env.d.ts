/// <reference types="vite/client" />

import type { HypermailDesktopApi } from "@shared/contracts";

declare global {
  interface Window {
    hypermail?: HypermailDesktopApi;
  }
}
