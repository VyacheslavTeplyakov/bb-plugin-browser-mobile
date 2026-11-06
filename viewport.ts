import type { ViewportWidth } from "./presets.js";

export interface ViewportSize {
  viewportWidth: number;
  panelWidth: number;
}

export interface ViewportBinding {
  setWidth(width: ViewportWidth): void;
  dispose(): void;
}

function findViewport(button: HTMLElement): HTMLElement | null {
  const root = button.closest("[data-app-browser]");
  const viewport = root?.lastElementChild;
  if (
    !(viewport instanceof HTMLElement) ||
    viewport.contains(button) ||
    !viewport.classList.contains("relative") ||
    !viewport.classList.contains("flex-1") ||
    !root?.querySelector('[role="region"][aria-label="Browser navigation"]')
  ) return null;
  return viewport;
}

export function createViewportService() {
  const bindings = new Set<ViewportBinding>();
  let disposed = false;

  return {
    bind(button: HTMLElement, onResize?: (size: ViewportSize) => void): ViewportBinding | null {
      const viewport = findViewport(button);
      if (disposed || viewport === null) return null;

      const saved = new Map<string, { value: string; priority: string }>();
      const applied = new Map<string, string>();
      let released = false;

      const measure = () => {
        if (released) return;
        onResize?.({
          viewportWidth: Math.round(viewport.getBoundingClientRect().width),
          panelWidth: Math.round(viewport.parentElement?.getBoundingClientRect().width ?? 0),
        });
      };

      const observer = typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(measure);
      observer?.observe(viewport);
      if (viewport.parentElement) observer?.observe(viewport.parentElement);
      measure();

      const restore = () => {
        for (const [property, value] of applied) {
          const previous = saved.get(property);
          if (previous && viewport.style.getPropertyValue(property) === value &&
            viewport.style.getPropertyPriority(property) === "") {
            if (previous.value) {
              viewport.style.setProperty(property, previous.value, previous.priority);
            } else {
              viewport.style.removeProperty(property);
            }
          }
        }
        if (viewport.getAttribute("style") === "") viewport.removeAttribute("style");
        saved.clear();
        applied.clear();
      };

      const binding: ViewportBinding = {
        setWidth(width) {
          if (released) return;
          if (width === null) {
            restore();
            measure();
            return;
          }
          const styles = {
            width: `${width}px`,
            "max-width": "100%",
            "margin-left": "auto",
            "margin-right": "auto",
          };
          for (const [property, value] of Object.entries(styles)) {
            if (!saved.has(property)) {
              saved.set(property, {
                value: viewport.style.getPropertyValue(property),
                priority: viewport.style.getPropertyPriority(property),
              });
            }
            viewport.style.setProperty(property, value);
            applied.set(property, value);
          }
          measure();
        },
        dispose() {
          if (released) return;
          restore();
          released = true;
          observer?.disconnect();
          bindings.delete(binding);
        },
      };
      bindings.add(binding);
      return binding;
    },
    dispose() {
      disposed = true;
      for (const binding of bindings) binding.dispose();
    },
  };
}
