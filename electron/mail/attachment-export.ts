import { app, dialog, type BrowserWindow } from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import type {
  CachedAttachmentPayload,
  SaveCachedAttachmentResult
} from "../../src/shared/contracts";

export async function saveCachedAttachmentToDisk(
  input: CachedAttachmentPayload,
  parentWindow?: BrowserWindow | null
): Promise<SaveCachedAttachmentResult> {
  const defaultFilename = sanitizeAttachmentFilename(input.filename);
  const downloadsPath = app.getPath("downloads");
  const dialogOptions = {
    defaultPath: path.join(downloadsPath, defaultFilename),
    buttonLabel: "Save attachment"
  };
  const result = parentWindow
    ? await dialog.showSaveDialog(parentWindow, dialogOptions)
    : await dialog.showSaveDialog(dialogOptions);

  if (result.canceled || !result.filePath) {
    return {
      canceled: true
    };
  }

  await fs.writeFile(result.filePath, Buffer.from(input.contentBase64, "base64"));

  return {
    canceled: false,
    filePath: result.filePath
  };
}

function sanitizeAttachmentFilename(filename: string): string {
  const safeFilename = path
    .basename(filename || "attachment.bin")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .trim();

  return safeFilename.length > 0 ? safeFilename : "attachment.bin";
}
