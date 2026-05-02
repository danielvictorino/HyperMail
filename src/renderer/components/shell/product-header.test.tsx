// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { clickElement, findButton, renderReact } from "@/test/render";
import { ProductHeader } from "./product-header";

let view: ReturnType<typeof renderReact> | null = null;

afterEach(() => {
  view?.unmount();
  view = null;
});

describe("ProductHeader", () => {
  it("shows selected account context and runs reply as the primary action", async () => {
    const onPrimaryAction = vi.fn();

    view = renderReact(
      <ProductHeader
        accountEmail="daniel@example.com"
        accountName="Daniel Victorino"
        connectedProvider="google"
        isDemo={false}
        title="Important triage"
        workspaceLabel="Gmail workspace"
        syncBadgeLabel="Synced 10:30"
        effectiveOnline
        commandHint="Ctrl+K"
        selectedThreadSubject="Investor update"
        composerOpen={false}
        onOpenPalette={vi.fn()}
        onPrimaryAction={onPrimaryAction}
      />
    );

    expect(view.container.textContent).toContain("Daniel Victorino");
    expect(view.container.textContent).toContain("daniel@example.com");
    expect(view.container.textContent).toContain("Gmail");
    expect(view.container.textContent).toContain("Important triage");

    await clickElement(findButton(view.container, "Reply"));

    expect(onPrimaryAction).toHaveBeenCalledOnce();
  });

  it("falls back to command as the primary action without a selected thread", async () => {
    const onPrimaryAction = vi.fn();

    view = renderReact(
      <ProductHeader
        accountEmail="demo@hypermail.local"
        accountName="Demo mailbox"
        connectedProvider={null}
        isDemo
        title="Inbox triage"
        workspaceLabel="Offline-first demo"
        syncBadgeLabel="Demo mailbox"
        effectiveOnline={false}
        commandHint="Ctrl+K"
        selectedThreadSubject={null}
        composerOpen={false}
        onOpenPalette={vi.fn()}
        onPrimaryAction={onPrimaryAction}
      />
    );

    await clickElement(findButton(view.container, "Command"));

    expect(onPrimaryAction).toHaveBeenCalledOnce();
  });
});
