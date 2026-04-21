import path from "node:path";

export interface RuntimeConfigPathOptions {
  explicitPath?: string | null;
  cwd: string;
  userDataPath: string;
  appPath: string;
  execDir: string;
  resourcesPath: string;
  packaged: boolean;
}

function uniquePaths(paths: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const values: string[] = [];

  for (const candidate of paths) {
    if (!candidate) {
      continue;
    }

    const resolved = path.resolve(candidate);

    if (seen.has(resolved)) {
      continue;
    }

    seen.add(resolved);
    values.push(resolved);
  }

  return values;
}

export function getPreferredRuntimeConfigPath(
  options: RuntimeConfigPathOptions
): string {
  return options.packaged
    ? path.join(options.userDataPath, ".env")
    : path.join(options.cwd, ".env");
}

export function buildRuntimeConfigSearchPaths(
  options: RuntimeConfigPathOptions
): string[] {
  const explicitPath = options.explicitPath?.trim() || null;
  const preferredPath = getPreferredRuntimeConfigPath(options);
  const appRootPath = path.join(options.appPath, ".env");
  const userDataPath = path.join(options.userDataPath, ".env");
  const execPath = path.join(options.execDir, ".env");
  const resourcesPath = path.join(options.resourcesPath, ".env");
  const cwdPath = path.join(options.cwd, ".env");

  if (options.packaged) {
    return uniquePaths([
      explicitPath,
      preferredPath,
      execPath,
      resourcesPath,
      cwdPath,
      appRootPath,
      userDataPath
    ]);
  }

  return uniquePaths([
    explicitPath,
    preferredPath,
    appRootPath,
    userDataPath,
    execPath,
    resourcesPath,
    cwdPath
  ]);
}
