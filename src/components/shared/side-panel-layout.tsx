import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SidePanelLayoutProps {
  title: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
  /**
   * Additional content to render in the header (e.g. clear button)
   */
  headerActions?: ReactNode;
  /**
   * Whether to remove default padding from content area
   */
  noContentPadding?: boolean;
}

export function SidePanelLayout({
  title,
  children,
  onClose,
  className,
  headerActions,
  noContentPadding = false,
}: SidePanelLayoutProps) {
  return (
    <div
      className={cn(
        "h-full flex flex-col rounded-lg outline outline-border w-full bg-popover/50 backdrop-blur-xl overflow-hidden",
        className
      )}
    >
      <div className="flex justify-between items-center p-4 pb-2 shrink-0">
        <h1 className="text-2xl font-bold">{title}</h1>
        <div className="flex items-center gap-2">
          {headerActions}
          <Button size="icon-sm" variant="ghost" onClick={onClose}>
            <X />
          </Button>
        </div>
      </div>

      <div
        className={cn(
          "flex-1 overflow-hidden relative flex flex-col",
          !noContentPadding && "p-4"
        )}
      >
        {children}
      </div>
    </div>
  );
}
