// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { renderReact } from "@/test/render";
import { AppShell } from "./app-shell";

let view: ReturnType<typeof renderReact> | null = null;

afterEach(() => {
  view?.unmount();
  view = null;
});

describe("AppShell", () => {
  it("renders the sidebar, mailbox pane, and right rail surfaces", () => {
    view = renderReact(
      <AppShell
        sidebar={<nav>Account rail</nav>}
        main={<main>Mailbox pane</main>}
        rightRail={<aside>Context rail</aside>}
      />
    );

    expect(view.container.textContent).toContain("Account rail");
    expect(view.container.textContent).toContain("Mailbox pane");
    expect(view.container.textContent).toContain("Context rail");
    expect(view.container.querySelector(".hm-app-frame")).not.toBeNull();
    expect(view.container.querySelector(".hm-linear-sidebar")).not.toBeNull();
    expect(view.container.querySelector(".hm-linear-content")).not.toBeNull();
  });
});
