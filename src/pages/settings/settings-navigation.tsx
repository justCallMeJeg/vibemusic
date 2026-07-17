import { useSettingsStore } from "@/stores/settings-store";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, PanelLeft } from "lucide-react";
import { SettingsRow } from "@/components/shared/settings-row";
import { SettingsGroup } from "@/components/shared/settings-group";
import { SidebarCustomizer } from "./sidebar-customizer";

export function SettingsNavigation() {
  const defaultPage = useSettingsStore((s) => s.defaultPage);
  const setDefaultPage = useSettingsStore((s) => s.setDefaultPage);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <PanelLeft className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-semibold">Navigation</h2>
      </div>

      <div className="grid gap-6">
        <SettingsRow
          label="Default Page"
          description="Which page opens when the app starts"
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-32 justify-between">
                <span className="capitalize">{defaultPage}</span>
                <ChevronDown className="w-4 h-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuRadioGroup value={defaultPage} onValueChange={setDefaultPage}>
                <DropdownMenuRadioItem value="home">Home</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="songs">Songs</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="albums">Albums</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="playlists">Playlists</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </SettingsRow>

        <SettingsGroup
          title="Sidebar Items"
          description="Drag to reorder, click the eye to show or hide"
        >
          <div className="border-t border-border pt-4">
            <SidebarCustomizer />
          </div>
        </SettingsGroup>
      </div>
    </div>
  );
}
