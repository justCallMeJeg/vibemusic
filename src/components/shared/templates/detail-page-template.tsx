import { useRef } from "react";
import { CompactPageHeader } from "@/components/shared/compact-page-header";
import { cn } from "@/lib/utils";

interface DetailPageTemplateProps {
  title: string;
  subtitle?: string;
  artworkSrc?: string;
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
  artworkSrc,
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
      if (scrollTop > threshold) {
        if (header.dataset.visible !== "true") {
          header.style.opacity = "1";
          header.dataset.visible = "true";
        }
      } else {
        if (header.dataset.visible !== "false") {
          header.style.opacity = "0";
          header.dataset.visible = "false";
        }
      }
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
        artworkSrc={artworkSrc}
        onBack={onBack}
        onPlay={onPlay}
      />
      {/* 
        We rely on the child (VirtualizedList) to invoke the scroll handler.
        In a perfect world, this template would wrap the scrollable area,
        but VirtualizedList manages its own scroll container.
        So we pass handleScroll to the child to use.
      */}
      {/* 
        Ideally, we'd pass a prop like `scrollHandler={handleScroll}` to children,
        but standard `children` prop makes it tricky without cloneElement.
        For now, we expect the usage to be manual composition in the page component
        OR we refactor VirtualizedList to forward scroll events if wrapped here?
        
        Let's try a simpler approach: The Template renders the container and header,
        but exposes the `handleScroll` function or simply logic for the page to use?
        
        No, cleaner API: <DetailPageTemplate ... ><VirtualizedList onScroll={handleScroll} ... /></DetailPageTemplate>
        But wait, `handleScroll` is defined INSIDE here.
        
        Better API:
        The Page renders:
        <DetailPageTemplate ... >
           {(handleScroll) => <VirtualizedList onScroll={handleScroll} ... />}
        </DetailPageTemplate>
        
        Or simpler: The template IS the container. But VirtualizedList needs to be the `overflow-y-auto`.
        
        Actually, looking at `VirtualizedList` source, it IS the scroll container.
        So `DetailPageTemplate` is just a wrapper around it that places the CompactHeader on top.
      */}
      {
        typeof children === "function"
          ? (
              children as (
                onScroll: (e: React.UIEvent<HTMLDivElement>) => void
              ) => React.ReactNode
            )(handleScroll)
          : children // Fallback if user manages scroll differently
      }
    </div>
  );
}
