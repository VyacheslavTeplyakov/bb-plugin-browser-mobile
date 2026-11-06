import { afterEach, expect, it } from "vitest";
import { act, cleanup, fireEvent, waitFor } from "@testing-library/react";
import {
  loadPluginApp,
  mountPluginContentScripts,
  renderSlot,
} from "@get-bb/plugin-sdk/testing/app";
import type { ExperimentalPluginBrowserToolbarActionProps, JsonValue } from "@get-bb/plugin-sdk/app";

const props: ExperimentalPluginBrowserToolbarActionProps = {
  threadId: "test-thread",
  tabId: "first-tab",
  url: "https://example.test/",
  isCompactViewport: false,
  experimental_page: {
    evaluate: async () => null,
    onMessage: () => () => {},
  },
};

afterEach(cleanup);

it("opens the page overlay without changing the browser container layout", async () => {
  const { scripts, slot, expressions } = await mount();
  try {
    const button = slot.getAllByRole("button")[0]!;
    const viewport = slot.getByTestId("first-viewport");
    const before = viewport.style.cssText;
    fireEvent.click(button);
    await waitFor(() => expect(button.hasAttribute("disabled")).toBe(false));
    expect(expressions.some((text) => text.includes('"action":"open"'))).toBe(true);
    expect(slot.queryByRole("menu")).toBeNull();
    expect(viewport.style.cssText).toBe(before);
  } finally {
    slot.lifecycle.unmount();
    await scripts.lifecycle.dispose();
  }
});

async function mount(page = props.experimental_page) {
  const makePage = () => {
    const listeners = new Set<(data: JsonValue) => void>();
    const expressions: string[] = [];
    return {
      expressions,
      api: {
        evaluate: async (expression: string) => {
          expressions.push(expression);
          return null;
        },
        onMessage: (listener: (data: JsonValue) => void) => {
          listeners.add(listener);
          return () => { listeners.delete(listener); };
        },
      },
      send: (data: JsonValue) => act(() => {
        for (const listener of listeners) listener(data);
      }),
    };
  };
  const firstPage = makePage();
  const secondPage = makePage();
  const app = await loadPluginApp(() => import("./app.js"));
  const scripts = await mountPluginContentScripts(app, { pluginId: "browser-mobile" });
  const Action = app.browserToolbarActions[0]!.component;
  const slot = renderSlot({ component: () => (
    <>
      <div data-app-browser>
        <div role="region" aria-label="Browser navigation">
          <Action {...props} experimental_page={page === null ? null : firstPage.api} />
        </div>
        <div className="relative min-h-0 flex-1" data-testid="first-viewport" />
      </div>
      <div data-app-browser>
        <div role="region" aria-label="Browser navigation">
          <Action {...props} tabId="second-tab" experimental_page={page === null ? null : secondPage.api} />
        </div>
        <div className="relative min-h-0 flex-1" data-testid="second-viewport" />
      </div>
    </>
  ) }, {});
  const choose = (id: string, index = 0) => {
    [firstPage, secondPage][index]!.send({ source: "browser-mobile-menu", action: "select", id });
  };
  return { scripts, slot, choose, expressions: firstPage.expressions };
}

it("switches presets only in the selected tab and restores the original styles", async () => {
  const { scripts, slot, choose } = await mount();
  try {
    const viewport = slot.getByTestId("first-viewport");
    const other = slot.getByTestId("second-viewport");
    viewport.style.setProperty("width", "85%", "important");
    viewport.style.backgroundColor = "red";
    const original = viewport.style.cssText;
    choose("phone");
    expect(viewport.style.width).toBe("390px");
    expect(other.getAttribute("style")).toBeNull();
    choose("tablet");
    expect(viewport.style.width).toBe("768px");
    choose("desktop");
    expect(viewport.style.width).toBe("1280px");
    choose("full");
    expect(viewport.style.cssText).toBe(original);
  } finally {
    slot.lifecycle.unmount();
    await scripts.lifecycle.dispose();
  }
});

it("restores active viewports when the content script is disabled", async () => {
  const { scripts, slot, choose } = await mount();
  try {
    choose("tablet");
    choose("tablet", 1);
    await scripts.lifecycle.dispose();
    expect(slot.getByTestId("first-viewport").getAttribute("style")).toBeNull();
    expect(slot.getByTestId("second-viewport").getAttribute("style")).toBeNull();
  } finally {
    slot.lifecycle.unmount();
    await scripts.lifecycle.dispose();
  }
});

it("disables the picker without the native desktop page", async () => {
  const { scripts, slot } = await mount(null);
  try {
    for (const picker of slot.getAllByRole("button")) {
      expect(picker.hasAttribute("disabled")).toBe(true);
    }
    expect(slot.getByTestId("first-viewport").getAttribute("style")).toBeNull();
  } finally {
    slot.lifecycle.unmount();
    await scripts.lifecycle.dispose();
  }
});

it("restores an active viewport when the toolbar unmounts", async () => {
  const { scripts, slot, choose } = await mount();
  try {
    const viewport = slot.getByTestId("first-viewport");
    choose("phone");
    slot.lifecycle.unmount();
    expect(viewport.getAttribute("style")).toBeNull();
  } finally {
    slot.lifecycle.unmount();
    await scripts.lifecycle.dispose();
  }
});

it("reports the real width when a preset is limited by the panel", async () => {
  const { scripts, slot, choose } = await mount();
  try {
    const viewport = slot.getByTestId("first-viewport");
    viewport.getBoundingClientRect = () => new DOMRect(0, 0, 600, 800);
    const picker = slot.getAllByRole("button")[0]!;
    choose("desktop");
    expect(picker.getAttribute("title")).toContain("Фактически 600 px");
    expect(slot.getByText("600*")).toBeTruthy();
  } finally {
    slot.lifecycle.unmount();
    await scripts.lifecycle.dispose();
  }
});

it("keeps style changes made by another owner while a preset is active", async () => {
  const { scripts, slot, choose } = await mount();
  try {
    const viewport = slot.getByTestId("first-viewport");
    choose("phone");
    viewport.style.setProperty("width", "520px", "important");
    choose("full");
    expect(viewport.style.width).toBe("520px");
    expect(viewport.style.getPropertyPriority("width")).toBe("important");
  } finally {
    slot.lifecycle.unmount();
    await scripts.lifecycle.dispose();
  }
});

it("closes the themed menu on Escape or outside interaction", async () => {
  const { scripts, slot } = await mount();
  try {
    const button = slot.getAllByRole("button")[0]!;
    fireEvent.click(button);
    await waitFor(() => expect(button.hasAttribute("disabled")).toBe(false));
    expect(button.getAttribute("aria-expanded")).toBe("true");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(button.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(button);
    await waitFor(() => expect(button.hasAttribute("disabled")).toBe(false));
    fireEvent.pointerDown(document.body);
    expect(button.getAttribute("aria-expanded")).toBe("false");
  } finally {
    slot.lifecycle.unmount();
    await scripts.lifecycle.dispose();
  }
});
