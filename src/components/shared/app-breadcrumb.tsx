import { useCallback } from "react";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
} from "@/components/ui/breadcrumb";
import { useBreadcrumbs, useNavigateToHistoryIndex } from "@/stores/navigation-store";

const MAX_VISIBLE_SEGMENTS = 4;

interface AppBreadcrumbProps {
  className?: string;
}

export function AppBreadcrumb({ className }: AppBreadcrumbProps) {
  const history = useBreadcrumbs();
  const navigateToHistoryIndex = useNavigateToHistoryIndex();

  const handleClick = useCallback(
    (index: number) => {
      navigateToHistoryIndex(index);
    },
    [navigateToHistoryIndex],
  );

  if (history.length <= 1) return null;

  const segments = history;
  const showEllipsis = segments.length > MAX_VISIBLE_SEGMENTS;

  let visibleSegments: { entry: (typeof segments)[number]; index: number }[];
  if (showEllipsis) {
    const first = segments[0];
    const lastTwo = segments.slice(-2);
    visibleSegments = [
      { entry: first, index: 0 },
      ...lastTwo.map((entry, i) => ({ entry, index: segments.length - 2 + i })),
    ];
  } else {
    visibleSegments = segments.map((entry, i) => ({ entry, index: i }));
  }

  return (
    <Breadcrumb className={className}>
      <BreadcrumbList>
        {visibleSegments.map(({ entry, index }, vi) => {
          const isLast = index === segments.length - 1;

          return (
            <BreadcrumbItem key={index}>
              {showEllipsis && vi === 1 && index > 1 && (
                <>
                  <BreadcrumbEllipsis />
                  <BreadcrumbSeparator />
                </>
              )}
              {isLast ? (
                <BreadcrumbPage className="text-xs sm:text-sm">
                  {entry.label}
                </BreadcrumbPage>
              ) : (
                <BreadcrumbLink
                  className="text-xs sm:text-sm cursor-pointer"
                  onClick={() => handleClick(index)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleClick(index);
                    }
                  }}
                >
                  {entry.label}
                </BreadcrumbLink>
              )}
              {!isLast && <BreadcrumbSeparator />}
            </BreadcrumbItem>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
