import {
  Disc,
  ListMusic,
  Music,
  Search,
  Settings,
  TvMinimal,
} from "lucide-react";
import { Button } from "./button";

export default function NavigationMenu() {
  return (
    <div
      id="navigation-menu"
      className="items-center h-min w-full flex flex-col gap-2 rounded-lg outline outline-gray-850 px-1 py-4"
    >
      <Button size={"icon-lg"} variant="ghost">
        <TvMinimal />
      </Button>
      <Button size={"icon-lg"} variant="ghost">
        <Search />
      </Button>
      <Button size={"icon-lg"} variant="ghost">
        <Music />
      </Button>
      <Button size={"icon-lg"} variant="ghost">
        <Disc />
      </Button>
      <Button size={"icon-lg"} variant="ghost">
        <ListMusic />
      </Button>
      <Button size={"icon-lg"} variant="ghost">
        <Settings />
      </Button>
    </div>
  );
}
