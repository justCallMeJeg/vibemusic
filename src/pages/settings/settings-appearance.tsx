import { useSettingsStore } from "@/stores/settings-store";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Moon, Sun, Monitor, Palette } from "lucide-react";
import { SettingsRow } from "@/components/shared/settings-row";
import { SettingsGroup } from "@/components/shared/settings-group";

export function SettingsAppearance() {
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const dynamicGradient = useSettingsStore((s) => s.dynamicGradient);
  const setDynamicGradient = useSettingsStore((s) => s.setDynamicGradient);
  const miniPlayerStyle = useSettingsStore((s) => s.miniPlayerStyle);
  const setMiniPlayerStyle = useSettingsStore((s) => s.setMiniPlayerStyle);
  const miniPlayerPosition = useSettingsStore((s) => s.miniPlayerPosition);
  const setMiniPlayerPosition = useSettingsStore(
    (s) => s.setMiniPlayerPosition,
  );
  const enableMediaKeys = useSettingsStore((s) => s.enableMediaKeys);
  const setEnableMediaKeys = useSettingsStore((s) => s.setEnableMediaKeys);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Palette className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-semibold">Appearance</h2>
      </div>

      <div className="grid gap-6">
        <SettingsRow
          label="Theme"
          description="Choose your preferred visual theme"
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-32 justify-between">
                <span className="capitalize">{theme}</span>
                <ChevronDown className="w-4 h-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuRadioGroup
                value={theme}
                onValueChange={(v) =>
                  setTheme(v as "dark" | "light" | "system")
                }
              >
                <DropdownMenuRadioItem value="light">
                  <Sun className="w-4 h-4 mr-2" />
                  Light
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="dark">
                  <Moon className="w-4 h-4 mr-2" />
                  Dark
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="system">
                  <Monitor className="w-4 h-4 mr-2" />
                  System
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </SettingsRow>

        <SettingsRow
          label="Dynamic Background"
          description="Ambient gradient based on current album art"
        >
          <Switch
            checked={dynamicGradient}
            onCheckedChange={setDynamicGradient}
          />
        </SettingsRow>

        <div className="border-t border-border pt-6 -mb-3" />

        <SettingsGroup title="Mini Player">
          <div className="space-y-4">
            <SettingsRow variant="nested" label="Layout">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-32 justify-between">
                    <span className="capitalize">{miniPlayerStyle}</span>
                    <ChevronDown className="w-4 h-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuRadioGroup
                    value={miniPlayerStyle}
                    onValueChange={(v) =>
                      setMiniPlayerStyle(v as "square" | "wide" | "bar")
                    }
                  >
                    <DropdownMenuRadioItem value="square">
                      Square
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="wide">
                      Wide
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="bar">
                      Bar
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </SettingsRow>

            <SettingsRow variant="nested" label="Position">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-32 justify-between">
                    <span className="capitalize">
                      {miniPlayerPosition.replace("-", " ")}
                    </span>
                    <ChevronDown className="w-4 h-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuRadioGroup
                    value={miniPlayerPosition}
                    onValueChange={(v) =>
                      setMiniPlayerPosition(
                        v as
                          | "bottom-right"
                          | "bottom-left"
                          | "top-right"
                          | "top-left",
                      )
                    }
                  >
                    <DropdownMenuRadioItem value="bottom-right">
                      Bottom Right
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="bottom-left">
                      Bottom Left
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="top-right">
                      Top Right
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="top-left">
                      Top Left
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </SettingsRow>
          </div>
        </SettingsGroup>

        <SettingsRow
          label="Media Keys"
          description="Allow keyboard media keys to control playback"
        >
          <Switch
            checked={enableMediaKeys}
            onCheckedChange={setEnableMediaKeys}
          />
        </SettingsRow>
      </div>
    </div>
  );
}
