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
import { ChevronDown, Moon, Sun, Monitor, Palette, Layout } from "lucide-react";
import { SidebarCustomizer } from "./sidebar-customizer";

export function SettingsAppearance() {
  const {
    theme,
    setTheme,
    dynamicGradient,
    setDynamicGradient,
    defaultPage,
    setDefaultPage,
  } = useSettingsStore();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Palette className="w-5 h-5 text-purple-500" />
        <h2 className="text-xl font-semibold">Appearance</h2>
      </div>

      <div className="grid gap-6">
        {/* Theme Setting */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/50 border border-border">
          <div className="space-y-1">
            <div className="font-medium">Theme</div>
            <div className="text-sm text-muted-foreground">
              Choose your preferred visual theme
            </div>
          </div>
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
        </div>

        {/* Dynamic Gradient Setting */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/50 border border-border">
          <div className="space-y-1">
            <div className="font-medium">Dynamic Background</div>
            <div className="text-sm text-muted-foreground">
              Ambient gradient based on current album art
            </div>
          </div>
          <Switch
            checked={dynamicGradient}
            onCheckedChange={setDynamicGradient}
          />
        </div>
        {/* Mini Player Layout */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
          <div className="space-y-1">
            <div className="font-medium">Mini Player Layout</div>
            <div className="text-sm text-gray-400">
              Choose the layout for the mini player window
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-32 justify-between">
                <span className="capitalize">
                  {useSettingsStore().miniPlayerStyle}
                </span>
                <ChevronDown className="w-4 h-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuRadioGroup
                value={useSettingsStore().miniPlayerStyle}
                onValueChange={(v) =>
                  useSettingsStore
                    .getState()
                    .setMiniPlayerStyle(v as "square" | "wide" | "bar")
                }
              >
                <DropdownMenuRadioItem value="square">
                  Square
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="wide">Wide</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="bar">Bar</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Sidebar Layout */}
        <div className="flex flex-col gap-4 p-4 rounded-xl bg-secondary/50 border border-border">
          <div className="flex items-center gap-2 mb-2">
            <Layout className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-medium">Sidebar Layout</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Default Page</div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-32 justify-between">
                    <span className="capitalize">{defaultPage}</span>
                    <ChevronDown className="w-4 h-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuRadioGroup
                    value={defaultPage}
                    onValueChange={setDefaultPage}
                  >
                    <DropdownMenuRadioItem value="home">
                      Home
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="songs">
                      Songs
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="albums">
                      Albums
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="playlists">
                      Playlists
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="border-t border-border pt-4">
              <div className="text-sm text-muted-foreground mb-2">
                Customize Sidebar Items
              </div>
              <SidebarCustomizer />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
