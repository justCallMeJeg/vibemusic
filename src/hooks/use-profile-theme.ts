import { useEffect } from "react";
import { useProfileStore } from "@/stores/profile-store";
import { useSettingsStore } from "@/stores/settings-store";
import { hexToHsl, hslToRgb, relativeLuminance, contrastRatio } from "@/lib/color-utils";
import { logger } from "@/lib/logger";

const THEME_VARS = [
  "primary",
  "primary-foreground",
  "accent",
  "accent-foreground",
  "ring",
  "sidebar-primary",
  "sidebar-primary-foreground",
  "sidebar-ring",
] as const;

function hsl(h: number, s: number, l: number): string {
  return `hsl(${Math.round(h)} ${s}% ${l}%)`;
}

function isValidHex(hex: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(hex);
}

export function useProfileTheme() {
  const activeProfileId = useProfileStore((s) => s.activeProfileId);
  const profilesMap = useProfileStore((s) => s.profilesMap);
  const activeProfile = activeProfileId ? profilesMap.get(activeProfileId) : undefined;
  const resolvedTheme = useSettingsStore((s) => s.resolvedTheme);

  useEffect(() => {
    const root = document.documentElement;
    const color = activeProfile?.color;

    const setOn = (el: HTMLElement, key: string, value: string) =>
      el.style.setProperty(`--${key}`, value);
    const removeOn = (el: HTMLElement, key: string) =>
      el.style.removeProperty(`--${key}`);

    const reset = () => {
      for (const v of THEME_VARS) {
        removeOn(root, v);
        for (const dark of document.querySelectorAll(".dark")) {
          removeOn(dark as HTMLElement, v);
        }
      }
    };

    if (!color || !isValidHex(color)) {
      reset();
      return;
    }

    const [h, , originalL] = hexToHsl(color);
    if (typeof h !== "number" || isNaN(h)) {
      logger.warn("[theme] Invalid hue from profile color:", color);
      reset();
      return;
    }

    function hslToHex(hue: number, sat: number, light: number): string {
      const [r, g, b] = hslToRgb(hue, sat, light);
      return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
    }

    function ensureContrast(
      hue: number,
      sat: number,
      lightness: number,
      minRatio: number,
    ): number {
      let l = lightness;
      while (l > 5) {
        const hex = hslToHex(hue, sat, l);
        const lum = relativeLuminance(hex);
        if (contrastRatio(1.0, lum) >= minRatio) break;
        l -= 1;
      }
      return l;
    }

    const isDark = resolvedTheme === "dark";

    let vars: Record<string, string>;

    if (isDark) {
      vars = {
        "primary": hsl(h, 50, 65),
        "primary-foreground": hsl(0, 0, 10),
        "accent": hsl(h, 20, 20),
        "accent-foreground": hsl(h, 40, 80),
        "ring": hsl(h, 40, 55),
        "sidebar-primary": hsl(h, 55, 55),
        "sidebar-primary-foreground": hsl(0, 0, 10),
        "sidebar-ring": hsl(h, 35, 50),
      };
    } else {
      const SAT = 70;
      const l = ensureContrast(h, SAT, Math.max(originalL * 0.5, 5), 4.5);
      const DAL = Math.max(l - 60, 5);
      vars = {
        "primary": hsl(h, SAT, l),
        "primary-foreground": hsl(0, 0, 100),
        "accent": hsl(h, 30, 92),
        "accent-foreground": hsl(h, 55, DAL),
        "ring": hsl(h, 55, Math.max(l - 10, 10)),
        "sidebar-primary": hsl(h, 60, Math.max(l - 15, 10)),
        "sidebar-primary-foreground": hsl(0, 0, 100),
        "sidebar-ring": hsl(h, 50, Math.max(l - 12, 10)),
      };
    }

    const targets = [root, ...document.querySelectorAll<HTMLElement>(".dark")];

    for (const [key, value] of Object.entries(vars)) {
      for (const target of targets) {
        setOn(target, key, value);
      }
    }

    logger.debug("[theme] Applied profile color:", color, isDark ? "dark" : "light");

    return reset;
  }, [activeProfile?.color, resolvedTheme]);
}
