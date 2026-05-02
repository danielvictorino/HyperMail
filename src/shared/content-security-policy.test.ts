import { describe, expect, it } from "vitest";
import { buildContentSecurityPolicy } from "./content-security-policy";

describe("buildContentSecurityPolicy", () => {
  it("keeps production script policy strict", () => {
    const policy = buildContentSecurityPolicy();

    expect(policy).toContain("script-src 'self'");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).not.toContain("script-src 'self' 'unsafe-inline'");
    expect(policy).not.toContain("script-src 'self' 'unsafe-eval'");
    expect(policy).not.toContain("http://127.0.0.1:5173");
  });

  it("allows the Vite React dev preamble only for dev", () => {
    const policy = buildContentSecurityPolicy({
      devServerUrl: "http://127.0.0.1:5173"
    });

    expect(policy).toContain(
      "script-src 'self' http://127.0.0.1:5173 'unsafe-eval' 'unsafe-inline'"
    );
    expect(policy).toContain("ws://127.0.0.1:5173");
  });

  it("can omit frame ancestors for meta policies", () => {
    const policy = buildContentSecurityPolicy({ includeFrameAncestors: false });

    expect(policy).not.toContain("frame-ancestors");
  });
});
