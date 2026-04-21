import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildRuntimeConfigSearchPaths,
  getPreferredRuntimeConfigPath
} from "./runtime-config-paths";

describe("runtime-config-paths", () => {
  const baseOptions = {
    explicitPath: null,
    cwd: "C:/workspace/hypermail",
    userDataPath: "C:/Users/Daniel/AppData/Roaming/HyperMail",
    appPath: "C:/workspace/hypermail",
    execDir: "C:/Program Files/HyperMail",
    resourcesPath: "C:/Program Files/HyperMail/resources"
  };

  it("prefers the repo env path in development", () => {
    const preferred = getPreferredRuntimeConfigPath({
      ...baseOptions,
      packaged: false
    });

    expect(preferred).toBe(path.resolve("C:/workspace/hypermail/.env"));
  });

  it("prefers the userData env path when packaged", () => {
    const preferred = getPreferredRuntimeConfigPath({
      ...baseOptions,
      packaged: true
    });

    expect(preferred).toBe(
      path.resolve("C:/Users/Daniel/AppData/Roaming/HyperMail/.env")
    );
  });

  it("orders packaged search paths toward userData and executable-adjacent config", () => {
    const searchPaths = buildRuntimeConfigSearchPaths({
      ...baseOptions,
      explicitPath: "D:/portable/hypermail.env",
      packaged: true
    });

    expect(searchPaths).toEqual([
      path.resolve("D:/portable/hypermail.env"),
      path.resolve("C:/Users/Daniel/AppData/Roaming/HyperMail/.env"),
      path.resolve("C:/Program Files/HyperMail/.env"),
      path.resolve("C:/Program Files/HyperMail/resources/.env"),
      path.resolve("C:/workspace/hypermail/.env")
    ]);
  });
});
