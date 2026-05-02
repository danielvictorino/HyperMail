import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";

interface ActEnvironmentGlobal {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
}

interface RenderResult {
  container: HTMLDivElement;
  rerender: (ui: ReactElement) => void;
  unmount: () => void;
}

(globalThis as typeof globalThis & ActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT =
  true;

export function renderReact(ui: ReactElement): RenderResult {
  const container = document.createElement("div");
  document.body.appendChild(container);

  let root: Root | null = null;
  act(() => {
    root = createRoot(container);
    root.render(ui);
  });

  if (!root) {
    throw new Error("React root was not created.");
  }

  return {
    container,
    rerender: (nextUi) => {
      act(() => {
        root?.render(nextUi);
      });
    },
    unmount: () => {
      act(() => {
        root?.unmount();
      });
      container.remove();
    }
  };
}

export async function flushReact(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
  });
}

export async function clickElement(element: Element): Promise<void> {
  await act(async () => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
  await flushReact();
}

export async function setInputValue(
  input: HTMLInputElement,
  value: string
): Promise<void> {
  await act(async () => {
    setNativeValue(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
  });
  await flushReact();
}

export async function setSelectValue(
  select: HTMLSelectElement,
  value: string
): Promise<void> {
  await act(async () => {
    select.value = value;
    select.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
  });
  await flushReact();
}

export function findButton(container: ParentNode, label: string): HTMLButtonElement {
  const button = Array.from(container.querySelectorAll("button")).find((candidate) =>
    candidate.textContent?.includes(label)
  );

  if (!button) {
    throw new Error(`Could not find button containing "${label}".`);
  }

  return button;
}

export function findSelectByLabel(
  container: ParentNode,
  label: string
): HTMLSelectElement {
  const labelElement = Array.from(container.querySelectorAll("label")).find(
    (candidate) => candidate.textContent?.includes(label)
  );
  const select = labelElement?.querySelector("select");

  if (!select) {
    throw new Error(`Could not find select labeled "${label}".`);
  }

  return select;
}

function setNativeValue(
  element: HTMLInputElement | HTMLSelectElement,
  value: string
): void {
  const descriptor = Object.getOwnPropertyDescriptor(
    Object.getPrototypeOf(element),
    "value"
  );

  descriptor?.set?.call(element, value);
}
