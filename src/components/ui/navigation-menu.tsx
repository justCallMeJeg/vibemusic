import {
  Disc,
  ListMusic,
  Music,
  Search,
  Settings,
  TvMinimal,
} from "lucide-react";
import { Button } from "./button";
import {
  useCurrentPage,
  useNavigationStore,
  type Page,
} from "@/stores/navigation-store";

export default function NavigationMenu() {
  const currentPage = useCurrentPage();
  const setPage = useNavigationStore((s) => s.setPage);

  const navItems: { icon: React.ReactNode; page: Page | null }[] = [
    { icon: <TvMinimal />, page: null }, // Home/Overview - not implemented yet
    { icon: <Search />, page: null }, // Search - not implemented yet
    { icon: <Music />, page: "songs" },
    { icon: <Disc />, page: "albums" },
    { icon: <ListMusic />, page: "playlists" },
    { icon: <Settings />, page: "settings" },
  ];

  return (
    <div
      id="navigation-menu"
      className="items-center h-min w-full flex flex-col gap-2 rounded-lg outline outline-gray-850 px-1 py-4 overflow-hidden"
    >
      <div className="flex flex-col gap-2 shrink-0">
        {navItems.map((item, index) => {
          const isActive = item.page !== null && currentPage === item.page;
          const isDisabled = item.page === null;

          return (
            <Button
              key={index}
              size="icon-lg"
              variant="ghost"
              onClick={() => item.page && setPage(item.page)}
              disabled={isDisabled}
              className={
                isActive
                  ? "text-white"
                  : isDisabled
                  ? "text-gray-600 cursor-not-allowed"
                  : "text-gray-500 hover:text-white"
              }
            >
              {item.icon}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
