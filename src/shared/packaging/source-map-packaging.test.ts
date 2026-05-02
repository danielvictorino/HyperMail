import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

interface PackageJson {
  scripts?: Record<string, string>;
  build?: {
    files?: string[];
  };
}

function readPackageJson(): PackageJson {
  const packageJsonPath = path.resolve(process.cwd(), "package.json");
  return JSON.parse(readFileSync(packageJsonPath, "utf8")) as PackageJson;
}

describe("source map packaging guard", () => {
  it("keeps source maps out of packaged app files", () => {
    const packageJson = readPackageJson();

    expect(packageJson.build?.files).toContain("!**/*.map");
  });

  it("exposes a package-level app.asar source map check", () => {
    const packageJson = readPackageJson();

    expect(packageJson.scripts?.["package:check"]).toBe(
      "node scripts/assert-no-packaged-source-maps.cjs"
    );
  });
});
