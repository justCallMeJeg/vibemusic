import { useCallback } from "react";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useBreadcrumbs, useDetailView, useNavigationStore } from "@/stores/navigation-store";

const PARENT_MAP = {
  album: { label: "Albums", page: "albums" as const },
  artist: { label: "Artists", page: "artists" as const },
  playlist: { label: "Playlists", page: "playlists" as const },
} as const;

interface AppBreadcrumbProps {
  className?: string;
}

export function AppBreadcrumb({ className }: AppBreadcrumbProps) {
  const detailView = useDetailView();
  const history = useBreadcrumbs();
  const setPage = useNavigationStore((s) => s.setPage);

  const handleParentClick = useCallback(() => {
    if (detailView) {
      setPage(PARENT_MAP[detailView.type].page);
    }
  }, [detailView, setPage]);

  if (!detailView) return null;

  const parent = PARENT_MAP[detailView.type];
  const currentLabel = history[history.length - 1]?.label ?? parent.label;

  return (
    <Breadcrumb className={className}>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink
            className="text-xs sm:text-sm cursor-pointer"
            onClick={handleParentClick}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleParentClick();
              }
            }}
          >
            {parent.label}
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage className="text-xs sm:text-sm">
            {currentLabel}
          </BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
