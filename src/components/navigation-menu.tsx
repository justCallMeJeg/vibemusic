import {
  Disc,
  Import,
  ListMusic,
  Users,
  Music2,
  Settings,
  Search,
  Home,
  BarChart2,
} from "lucide-react";
import { Button } from "./ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useCurrentPage,
  useNavigationStore,
  type Page,
} from "@/stores/navigation-store";
import { useSettingsStore } from "@/stores/settings-store";

interface NavigationMenuProps {
  onImport?: () => void;
  isScanning?: boolean;
}

export default function NavigationMenu({
  onImport,
  isScanning,
}: NavigationMenuProps) {
  const currentPage = useCurrentPage();
  const setPage = useNavigationStore((s) => s.setPage);
  const toggleSearch = useNavigationStore((s) => s.toggleSearch);
  const isSearchOpen = useNavigationStore((s) => s.isSearchOpen);
  const sidebarItems = useSettingsStore((s) => s.sidebarItems);

  const iconMap: Record<string, React.ReactNode> = {
    home: <Home />,
    search: <Search />,
    songs: <Music2 />,
    albums: <Disc />,
    playlists: <ListMusic />,
    artists: <Users />,
    insights: <BarChart2 />,
    settings: <Settings />,
  };

  const labelMap: Record<string, string> = {
    home: "Home",
    search: "Search",
    songs: "Songs",
    albums: "Albums",
    playlists: "Playlists",
    artists: "Artists",
    insights: "Insights",
    settings: "Settings",
  };

  return (
    <aside id="navigation-menu" className="w-full flex flex-col gap-4">
      <div className="items-center h-min w-full flex flex-col gap-2 rounded-lg outline outline-border px-1 py-4">
        <div className="flex flex-col gap-2 shrink-0">
          {sidebarItems
            .filter((item) => !item.hidden)
            .map((item) => {
              const isSearch = item.id === "search";
              // For pages, id matches the page name. For search, it's null page.
              const isActive = !isSearch && currentPage === item.id;

              return (
                <Tooltip key={item.id} delayDuration={1000}>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon-lg"
                      variant="ghost"
                      onClick={() => {
                        if (isSearch) toggleSearch();
                        else setPage(item.id as Page);
                      }}
                      className={
                        isActive || (isSearch && isSearchOpen)
                          ? "text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }
                    >
                      {iconMap[item.id] || <Disc />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {labelMap[item.id] || item.id}
                  </TooltipContent>
                </Tooltip>
              );
            })}
        </div>
      </div>
      <div
        className={`items-center h-min w-full flex flex-col rounded-lg outline outline-border py-3 ${
          isScanning ? "animate-pulse border border-blue-400" : ""
        }`}
      >
        <Tooltip delayDuration={1000}>
          <TooltipTrigger asChild>
            <Button
              size="icon-lg"
              variant="ghost"
              onClick={onImport}
              disabled={isScanning}
              className="text-muted-foreground hover:text-foreground"
            >
              <Import />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Import Library</TooltipContent>
        </Tooltip>
      </div>
    </aside>
  );
}
