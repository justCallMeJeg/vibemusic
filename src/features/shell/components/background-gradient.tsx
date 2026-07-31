import { adjustColorForTheme } from "@/lib/color-utils";
import { useSettingsStore } from "@/stores/settings-store";

interface BackgroundGradientProps {
  gradientColor: string;
}

export function BackgroundGradient({ gradientColor }: BackgroundGradientProps) {
  const resolvedTheme = useSettingsStore((s) => s.resolvedTheme);
  const dynamicGradient = useSettingsStore((s) => s.dynamicGradient);

  return (
    <div
      className="fixed top-0 left-0 right-0 pointer-events-none transition-colors duration-1000 ease-in-out z-0"
      style={{
        height: resolvedTheme === "dark" ? "24rem" : "20rem",
        opacity: resolvedTheme === "dark" ? 0.2 : 0.35,
        backgroundColor:
          dynamicGradient && gradientColor !== "transparent"
            ? adjustColorForTheme(gradientColor, resolvedTheme)
            : "transparent",
        maskImage: "linear-gradient(to bottom, black, transparent)",
        WebkitMaskImage: "linear-gradient(to bottom, black, transparent)",
      }}
    />
  );
}
