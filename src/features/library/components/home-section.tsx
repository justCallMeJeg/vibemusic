import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface HomeSectionProps<T> {
  title: string;
  items: T[];
  orientation?: "horizontal" | "vertical";
  onSeeAll?: () => void;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
}

export function HomeSection<T>({
  title,
  items,
  orientation = "horizontal",
  onSeeAll,
  renderItem,
  className,
}: HomeSectionProps<T>) {
  if (items.length === 0) return null;

  return (
    <section className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">{title}</h2>
        {onSeeAll && (
          <Button
            variant="ghost"
            className="text-sm text-muted-foreground hover:text-foreground"
            onClick={onSeeAll}
          >
            See all <ChevronRight size={16} />
          </Button>
        )}
      </div>
      <div
        className={
          orientation === "horizontal"
            ? "flex overflow-x-overlay pb-4 -mx-2 px-2"
            : "flex flex-col gap-1"
        }
      >
        {items.map((item, idx) => renderItem(item, idx))}
      </div>
    </section>
  );
}
