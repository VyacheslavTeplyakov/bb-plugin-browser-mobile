export const VIEWPORT_PRESETS = [
  { id: "full", label: "Вся панель", width: null, icon: "Monitor" },
  { id: "small-phone", label: "Маленький телефон", width: 360, icon: "Smartphone" },
  { id: "phone", label: "Телефон", width: 390, icon: "Smartphone" },
  { id: "large-phone", label: "Большой телефон", width: 430, icon: "Smartphone" },
  { id: "tablet", label: "Планшет", width: 768, icon: "Tablet" },
  { id: "laptop", label: "Ноутбук / планшет", width: 1024, icon: "Monitor" },
  { id: "desktop", label: "Десктоп", width: 1280, icon: "Monitor" },
] as const;

export type ViewportPreset = (typeof VIEWPORT_PRESETS)[number];
export type ViewportWidth = ViewportPreset["width"];

export function getViewportPreset(id: string): ViewportPreset | null {
  return VIEWPORT_PRESETS.find((preset) => preset.id === id) ?? null;
}
