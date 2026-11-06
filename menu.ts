export interface MenuTheme {
  background: string;
  foreground: string;
  muted: string;
  border: string;
  hover: string;
  font: string;
}

export type MenuCommand =
  | { action: "open"; selected: string; items: readonly { id: string; label: string; width: number | null }[]; theme: MenuTheme; note: string }
  | { action: "close" }
  | { action: "key"; key: string };

declare const bb: { postMessage(data: object): void };

export function runViewportMenu(command: MenuCommand): boolean {
  const menuId = "bb-browser-mobile-presets";
  const previous = document.getElementById(menuId) as
    (HTMLElement & { disposeMenu?: (notify: boolean) => void }) | null;
  if (command.action === "key") {
    const target = previous?.shadowRoot?.activeElement;
    target?.dispatchEvent(new KeyboardEvent("keydown", { key: command.key, bubbles: true }));
    return target !== undefined && target !== null;
  }
  previous?.disposeMenu?.(false);
  if (command.action === "close") return true;

  const host = document.createElement("div") as HTMLElement & { disposeMenu?: (notify: boolean) => void };
  host.id = menuId;
  Object.assign(host.style, {
    all: "initial", position: "fixed", inset: "0", zIndex: "2147483647", pointerEvents: "none",
  });
  const shadow = host.attachShadow({ mode: "open" });
  const menu = document.createElement("div");
  menu.setAttribute("role", "menu");
  menu.setAttribute("aria-label", "Ширина страницы");
  Object.assign(menu.style, {
    position: "absolute", top: "8px", right: "8px", boxSizing: "border-box",
    width: "280px", maxWidth: "calc(100% - 16px)", maxHeight: "calc(100% - 16px)",
    overflowY: "auto", padding: "6px", borderRadius: "10px", pointerEvents: "auto",
    background: command.theme.background, color: command.theme.foreground,
    border: `1px solid ${command.theme.border}`,
    boxShadow: `0 8px 28px color-mix(in srgb, ${command.theme.foreground} 18%, transparent)`,
    font: `13px ${command.theme.font}`, textAlign: "left", colorScheme: "normal",
  });
  const heading = document.createElement("div");
  heading.textContent = "Ширина страницы";
  Object.assign(heading.style, { padding: "6px 9px 8px", color: command.theme.muted, fontSize: "12px" });
  menu.append(heading);
  const buttons: HTMLButtonElement[] = [];
  let active = Math.max(0, command.items.findIndex((item) => item.id === command.selected));
  let removed = false;
  const focusItem = (index: number) => {
    active = (index + buttons.length) % buttons.length;
    buttons.forEach((button, i) => {
      button.tabIndex = i === active ? 0 : -1;
      button.style.background = i === active ? command.theme.hover : "transparent";
    });
    buttons[active]?.focus({ preventScroll: true });
    buttons[active]?.scrollIntoView?.({ block: "nearest" });
  };
  const dispose = (notify: boolean) => {
    if (removed) return;
    removed = true;
    document.removeEventListener("pointerdown", outside, true);
    host.remove();
    if (notify) bb.postMessage({ source: "browser-mobile-menu", action: "close" });
  };
  const outside = (event: Event) => {
    if (event.target !== host) dispose(true);
  };
  host.disposeMenu = dispose;

  for (const item of command.items) {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("role", "menuitemradio");
    button.setAttribute("aria-checked", String(item.id === command.selected));
    button.dataset.presetId = item.id;
    Object.assign(button.style, {
      display: "flex", alignItems: "center", gap: "8px", width: "100%", minHeight: "36px",
      boxSizing: "border-box", border: "0", borderRadius: "6px", padding: "8px 9px",
      background: "transparent", color: command.theme.foreground, font: "inherit",
      textAlign: "left", cursor: "pointer", outline: "none",
    });
    const check = document.createElement("span");
    check.textContent = item.id === command.selected ? "✓" : "";
    check.setAttribute("aria-hidden", "true");
    check.style.width = "14px";
    check.style.flexShrink = "0";
    const name = document.createElement("span");
    name.textContent = item.label;
    Object.assign(name.style, { flex: "1", minWidth: "0" });
    const width = document.createElement("span");
    width.textContent = item.width === null ? "Авто" : String(item.width);
    Object.assign(width.style, { color: command.theme.muted, fontVariantNumeric: "tabular-nums", flexShrink: "0" });
    button.append(check, name, width);
    const index = buttons.length;
    button.addEventListener("pointerenter", () => focusItem(index));
    button.addEventListener("click", () => {
      dispose(false);
      bb.postMessage({ source: "browser-mobile-menu", action: "select", id: item.id });
    });
    buttons.push(button);
    menu.append(button);
  }
  if (command.note) {
    const note = document.createElement("div");
    note.textContent = command.note;
    Object.assign(note.style, {
      marginTop: "6px", padding: "8px 9px 4px", borderTop: `1px solid ${command.theme.border}`,
      color: command.theme.muted, fontSize: "12px", lineHeight: "1.4",
    });
    menu.append(note);
  }
  menu.addEventListener("keydown", (event) => {
    if (event.key === "Escape" || event.key === "Tab") {
      if (event.key === "Escape") event.preventDefault();
      dispose(true);
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      focusItem(active + (event.key === "ArrowDown" ? 1 : -1));
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      focusItem(event.key === "Home" ? 0 : buttons.length - 1);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      buttons[active]?.click();
    }
  });
  shadow.append(menu);
  document.documentElement.append(host);
  document.addEventListener("pointerdown", outside, true);
  focusItem(active);
  return true;
}

export function menuExpression(command: MenuCommand): string {
  return `(${runViewportMenu.toString()})(${JSON.stringify(command)})`;
}

export function readMenuTheme(element: HTMLElement): MenuTheme {
  const probe = document.createElement("span");
  probe.style.display = "none";
  element.append(probe);
  const color = (token: string, fallback: string) => {
    probe.style.color = `var(${token}, var(${fallback}))`;
    return getComputedStyle(probe).color;
  };
  const theme = {
    background: color("--popover", "--background"),
    foreground: color("--popover-foreground", "--foreground"),
    muted: color("--muted-foreground", "--foreground"),
    border: color("--border", "--foreground"),
    hover: color("--state-hover", "--muted"),
    font: getComputedStyle(element).fontFamily || "system-ui, sans-serif",
  };
  probe.remove();
  return theme;
}
