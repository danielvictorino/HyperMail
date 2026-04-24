import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildRuntimeConfigSearchPaths,
  getPreferredRuntimeConfigPath
} from "./runtime-config-paths";

describe("runtime-config-paths", () => {
  const cwd = path.resolve("/workspace/hypermail");
  const userDataPath = path.resolve("/users/alex/AppData/Roaming/HyperMail");
  const appPath = path.resolve("/workspace/hypermail");
  const execDir = path.resolve("/Program Files/HyperMail");
  const resourcesPath = path.resolve("/Program Files/HyperMail/resources");

  const baseOptions = {
    explicitPath: null,
    cwd,
    userDataPath,
    appPath,
    execDir,
    resourcesPath
  };

  it("prefers the repo env path in development", () => {
    const preferred = getPreferredRuntimeConfigPath({
      ...baseOptions,
      packaged: false
    });

    expect(preferred).toBe(path.join(cwd, ".env"));
  });

  it("prefers the userData env path when packaged", () => {
    const preferred = getPreferredRuntimeConfigPath({
      ...baseOptions,
      packaged: true
    });

    expect(preferred).toBe(path.join(userDataPath, ".env"));
  });

  it("orders packaged search paths toward userData and executable-adjacent config", () => {
    const explicitPath = path.resolve("/portable/hypermail.env");
    const searchPaths = buildRuntimeConfigSearchPaths({
      ...baseOptions,
      explicitPath,
      packaged: true
    });

    expect(searchPaths).toEqual([
      path.resolve(explicitPath),
      path.resolve(path.join(userDataPath, ".env")),
      path.resolve(path.join(execDir, ".env")),
      path.resolve(path.join(resourcesPath, ".env")),
      path.resolve(path.join(cwd, ".env"))
    ]);
  });
});
