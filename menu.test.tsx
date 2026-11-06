import { afterEach, expect, it, vi } from "vitest";
import { fireEvent } from "@testing-library/react";
import { runViewportMenu } from "./menu.js";
import { VIEWPORT_PRESETS } from "./presets.js";

const theme = {
  background: "rgb(20, 30, 40)", foreground: "rgb(240, 245, 250)",
  muted: "rgb(170, 180, 190)", border: "rgb(60, 70, 80)",
  hover: "rgb(45, 55, 65)", font: "system-ui",
};

afterEach(() => {
  runViewportMenu({ action: "close" });
  vi.unstubAllGlobals();
});

it("uses the BB colors and leaves the existing page layout unchanged", () => {
  vi.stubGlobal("bb", { postMessage: vi.fn() });
  const before = document.body.style.cssText;
  runViewportMenu({ action: "open", selected: "phone", items: VIEWPORT_PRESETS, theme, note: "" });
  const host = document.getElementById("bb-browser-mobile-presets")!;
  const menu = host.shadowRoot!.querySelector<HTMLElement>('[role="menu"]')!;
  expect(host.style.position).toBe("fixed");
  expect(menu.style.background).toBe(theme.background);
  expect(menu.style.color).toBe(theme.foreground);
  expect(menu.querySelectorAll('[aria-checked="true"]')).toHaveLength(1);
  expect(menu.querySelector('[aria-checked="true"]')?.getAttribute("data-preset-id")).toBe("phone");
  expect(document.body.style.cssText).toBe(before);
});

it("supports keyboard selection and removes its overlay and outside listener", () => {
  const postMessage = vi.fn();
  vi.stubGlobal("bb", { postMessage });
  runViewportMenu({ action: "open", selected: "phone", items: VIEWPORT_PRESETS, theme, note: "" });
  runViewportMenu({ action: "key", key: "ArrowDown" });
  runViewportMenu({ action: "key", key: "Enter" });
  expect(postMessage).toHaveBeenCalledExactlyOnceWith({
    source: "browser-mobile-menu", action: "select", id: "large-phone",
  });
  expect(document.getElementById("bb-browser-mobile-presets")).toBeNull();
  fireEvent.pointerDown(document.body);
  expect(postMessage).toHaveBeenCalledTimes(1);
});

it("closes on outside clicks and replaces old overlays without leaking listeners", () => {
  const postMessage = vi.fn();
  vi.stubGlobal("bb", { postMessage });
  for (let i = 0; i < 2; i++) {
    runViewportMenu({ action: "open", selected: "phone", items: VIEWPORT_PRESETS, theme, note: "" });
  }
  expect(document.querySelectorAll("#bb-browser-mobile-presets")).toHaveLength(1);
  fireEvent.pointerDown(document.body);
  expect(postMessage).toHaveBeenCalledExactlyOnceWith({ source: "browser-mobile-menu", action: "close" });
  expect(document.getElementById("bb-browser-mobile-presets")).toBeNull();
});
