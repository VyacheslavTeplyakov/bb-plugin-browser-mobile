import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  definePluginApp,
  experimental_Icon as Icon,
  type ExperimentalPluginBrowserToolbarActionProps,
} from "@get-bb/plugin-sdk/app";
import { createViewportService, type ViewportBinding, type ViewportSize } from "./viewport.js";
import { getViewportPreset, VIEWPORT_PRESETS, type ViewportPreset } from "./presets.js";
import { menuExpression, readMenuTheme } from "./menu.js";

let viewportService: ReturnType<typeof createViewportService> | null = null;

export function ViewportPicker({ tabId, url, experimental_page: page }: ExperimentalPluginBrowserToolbarActionProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const bindingRef = useRef<ViewportBinding | null>(null);
  const [preset, setPreset] = useState<ViewportPreset>(VIEWPORT_PRESETS[0]);
  const [size, setSize] = useState<ViewportSize>({ viewportWidth: 0, panelWidth: 0 });
  const [available, setAvailable] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const requestRef = useRef(0);
  const hasDesktopPage = page !== null;

  useLayoutEffect(() => {
    const button = buttonRef.current;
    const binding = hasDesktopPage && button
      ? viewportService?.bind(button, (next) => {
        setSize((previous) => previous.viewportWidth === next.viewportWidth &&
          previous.panelWidth === next.panelWidth ? previous : next);
      }) ?? null : null;
    bindingRef.current = binding;
    setAvailable(binding !== null);
    setPreset(VIEWPORT_PRESETS[0]);
    return () => {
      requestRef.current++;
      binding?.dispose();
      bindingRef.current = null;
      void page?.evaluate(menuExpression({ action: "close" })).catch(() => {});
    };
  }, [tabId, hasDesktopPage]);

  const closeMenu = useCallback(() => {
    requestRef.current++;
    setOpen(false);
    void page?.evaluate(menuExpression({ action: "close" })).catch(() => {});
  }, [page]);

  useEffect(closeMenu, [url, tabId, closeMenu]);

  useEffect(() => page?.onMessage((data) => {
    if (data === null || typeof data !== "object" ||
      !("source" in data) || data.source !== "browser-mobile-menu" || !("action" in data)) return;
    if (data.action === "close") {
      setOpen(false);
    } else if (data.action === "select" && "id" in data && typeof data.id === "string") {
      const next = getViewportPreset(data.id);
      if (next === null || bindingRef.current === null) return;
      bindingRef.current.setWidth(next.width);
      setPreset(next);
      setOpen(false);
    }
  }), [page]);

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!(event.target instanceof Node) || !buttonRef.current?.contains(event.target)) closeMenu();
    };
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape" || event.key === "Tab") {
        if (event.key === "Escape") event.preventDefault();
        closeMenu();
      } else if (["ArrowDown", "ArrowUp", "Home", "End", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        void page?.evaluate(menuExpression({ action: "key", key: event.key })).catch(closeMenu);
      }
    };
    document.addEventListener("pointerdown", outside, true);
    document.addEventListener("keydown", keydown, true);
    return () => {
      document.removeEventListener("pointerdown", outside, true);
      document.removeEventListener("keydown", keydown, true);
    };
  }, [open, page, closeMenu]);

  const clamped = preset.width !== null && size.viewportWidth > 0 && size.viewportWidth < preset.width - 1;
  const label = !available ? "Выбор ширины недоступен в этой области браузера"
    : `Ширина страницы: ${preset.label}${preset.width === null ? "" : `, ${preset.width} px`}.${
      clamped ? ` Фактически ${size.viewportWidth} px: расширьте панель браузера.` : ""}`;

  const openMenu = async () => {
    if (busy || page === null || buttonRef.current === null) return;
    if (open) {
      closeMenu();
      return;
    }
    const request = ++requestRef.current;
    setBusy(true);
    setOpen(true);
    try {
      await page.evaluate(menuExpression({
        action: "open", selected: preset.id, items: VIEWPORT_PRESETS,
        theme: readMenuTheme(buttonRef.current),
        note: size.panelWidth > 0
          ? `Панель: ${size.panelWidth} px. Широкие режимы ограничены её размером.` : "",
      }));
      if (request !== requestRef.current) await page.evaluate(menuExpression({ action: "close" }));
    } catch {
      setOpen(false);
      toast.error("Не удалось открыть меню. Обновите вкладку браузера.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      ref={buttonRef} type="button" aria-label="Ширина страницы" aria-haspopup="menu" aria-expanded={open}
      disabled={!available || busy} title={label} onClick={() => void openMenu()}
      onKeyDown={(event) => {
        if (event.key === "ArrowDown" && !open) {
          event.preventDefault();
          void openMenu();
        }
      }}
      className="flex h-8 shrink-0 items-center justify-center gap-1 rounded-md px-2 text-muted-foreground hover:bg-state-hover hover:text-foreground disabled:opacity-40 aria-expanded:bg-state-hover aria-expanded:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      <Icon name={preset.icon} className="size-4" aria-hidden />
      <span className="text-xs tabular-nums" aria-hidden>{clamped ? `${size.viewportWidth}*` : preset.width ?? "Авто"}</span>
      <Icon name="ChevronDown" className="size-3" aria-hidden />
    </button>
  );
}

export default definePluginApp((app) => {
  app.contentScripts.register({
    id: "mobile-viewport-layout",
    mount() {
      const service = createViewportService();
      viewportService = service;
      return () => {
        service.dispose();
        if (viewportService === service) viewportService = null;
      };
    },
  });
  app.slots.experimental_browserToolbarAction({ id: "mobile-viewport", title: "Ширина страницы", component: ViewportPicker });
});
