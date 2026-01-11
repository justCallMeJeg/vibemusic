import {
  Disc,
  Import,
  ListMusic,
  Music,
  Search,
  Settings,
  TvMinimal,
} from "lucide-react";
import { Button } from "./ui/button";
import {
  useCurrentPage,
  useNavigationStore,
  type Page,
} from "@/stores/navigation-store";

interface NavigationMenuProps {
  onImport?: () => void;
  isScanning?: boolean;
}

import { useSettingsStore } from "@/stores/settings-store";

export default function NavigationMenu({
  onImport,
  isScanning,
}: NavigationMenuProps) {
  const currentPage = useCurrentPage();
  const setPage = useNavigationStore((s) => s.setPage);
  const toggleSearch = useNavigationStore((s) => s.toggleSearch);
  const isSearchOpen = useNavigationStore((s) => s.isSearchOpen);
  const { sidebarItems } = useSettingsStore();

  const iconMap: Record<string, React.ReactNode> = {
    home: <TvMinimal />,
    search: <Search />,
    songs: <Music />,
    albums: <Disc />,
    playlists: <ListMusic />,
    settings: <Settings />,
  };

  return (
    <aside id="navigation-menu" className="w-full flex flex-col gap-4">
      <div className="items-center h-min w-full flex flex-col gap-2 rounded-lg outline outline-gray-850 px-1 py-4">
        <div className="flex flex-col gap-2 shrink-0">
          {sidebarItems
            .filter((item) => !item.hidden)
            .map((item) => {
              const isSearch = item.id === "search";
              // For pages, id matches the page name. For search, it's null page.
              const isActive = !isSearch && currentPage === item.id;

              return (
                <Button
                  key={item.id}
                  size="icon-lg"
                  variant="ghost"
                  onClick={() => {
                    if (isSearch) toggleSearch();
                    else setPage(item.id as Page);
                  }}
                  className={
                    isActive || (isSearch && isSearchOpen)
                      ? "text-white"
                      : "text-gray-500 hover:text-white"
                  }
                >
                  {iconMap[item.id] || <Disc />}
                </Button>
              );
            })}
        </div>
      </div>
      <div
        className={`items-center h-min w-full flex flex-col rounded-lg outline outline-gray-850 py-3 ${
          isScanning ? "animate-pulse border border-blue-400" : ""
        }`}
      >
        <Button
          size="icon-lg"
          variant="ghost"
          onClick={onImport}
          disabled={isScanning}
          className="text-gray-500 hover:text-white"
        >
          <Import />
        </Button>
      </div>
    </aside>
  );
}
