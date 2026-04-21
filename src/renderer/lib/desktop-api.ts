import type { HypermailDesktopApi } from "@shared/contracts";

export function getDesktopApi(): HypermailDesktopApi {
  if (!window.hypermail) {
    throw new Error(
      "HyperMail preload bridge was not found. Start the Electron app with `npm run dev`."
    );
  }

  return window.hypermail;
}
