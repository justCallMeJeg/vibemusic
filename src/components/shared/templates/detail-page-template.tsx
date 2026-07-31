import { useRef } from "react";
import { CompactPageHeader } from "@/components/shared/compact-page-header";
import { cn } from "@/lib/utils";
import { DetailScrollContext } from "@/components/shared/scroll-context";

interface DetailPageTemplateProps {
  title: string;
  subtitle?: string;
  artworkPath?: string | null;
  onBack: () => void;
  onPlay?: () => void;
  children:
    | React.ReactNode
    | ((
        onScroll: (e: React.UIEvent<HTMLDivElement>) => void
      ) => React.ReactNode);
  className?: string;
  // Expose scroll handler if needed by parent, but ideally passed to children
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
}

export function DetailPageTemplate({
  title,
  subtitle,
  artworkPath,
  onBack,
  onPlay,
  children,
  className,
  onScroll,
}: DetailPageTemplateProps) {
  const headerRef = useRef<HTMLDivElement>(null);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    // Call external handler if provided
    onScroll?.(e);

    const scrollTop = e.currentTarget.scrollTop;
    const threshold = 300; // Show compact header after 300px
    const header = headerRef.current;

    if (header) {
      header.dataset.visible = scrollTop > threshold ? "true" : "false";
    }
  };

  return (
    <div
      className={cn(
        "flex-1 min-w-0 h-full flex flex-col overflow-hidden relative",
        className
      )}
    >
      <CompactPageHeader
        ref={headerRef}
        title={title}
        subtitle={subtitle}
        artworkPath={artworkPath}
        onBack={onBack}
        onPlay={onPlay}
      />
      <DetailScrollContext.Provider value={handleScroll}>
        {
          typeof children === "function"
            ? (
                children as (
                  onScroll: (e: React.UIEvent<HTMLDivElement>) => void
                ) => React.ReactNode
              )(handleScroll)
            : children
        }
      </DetailScrollContext.Provider>
    </div>
  );
}
