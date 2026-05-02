import { describe, expect, it } from "vitest";
import { DEMO_ACCOUNT } from "../offline/demo/seed-mailbox";
import { buildAccountDescriptor } from "./use-mailbox-account";

describe("buildAccountDescriptor", () => {
  it("uses the demo account without an authenticated session", () => {
    expect(buildAccountDescriptor(null)).toEqual(DEMO_ACCOUNT);
  });

  it("normalizes Google account identity from the session email", () => {
    const account = buildAccountDescriptor({
      provider: "google",
      connectedAt: 123,
      scopes: ["gmail.readonly"],
      account: {
        email: "Daniel@Example.com ",
        name: "Daniel Victorino"
      }
    });

    expect(account).toMatchObject({
      id: "google:daniel@example.com",
      email: "Daniel@Example.com ",
      displayName: "Daniel Victorino",
      provider: "google",
      connectedAt: 123
    });
  });

  it("falls back to email as the Microsoft display name", () => {
    const account = buildAccountDescriptor({
      provider: "microsoft",
      connectedAt: 456,
      scopes: ["Mail.Read"],
      account: {
        email: "daniel@example.com"
      }
    });

    expect(account).toMatchObject({
      id: "microsoft:daniel@example.com",
      displayName: "daniel@example.com",
      provider: "microsoft",
      connectedAt: 456
    });
  });
});
