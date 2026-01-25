import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { ArtworkImage } from "@/components/shared/artwork-image";

const rowVariants = cva(
  "group flex items-center gap-3 rounded-md px-2 transition-colors cursor-default select-none relative",
  {
    variants: {
      variant: {
        default: "h-14 hover:bg-accent/50",
        compact: "h-10 hover:bg-accent/50",
        detailed: "h-16 hover:bg-accent/50 p-2",
      },
      active: {
        true: "bg-accent/50 text-accent-foreground outline outline-1 outline-border",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      active: false,
    },
  }
);

interface EntityRowProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "contextMenu">,
    VariantProps<typeof rowVariants> {
  title: string;
  subtitle?: string;
  artworkSrc?: string;
  index?: number;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  /** Optional context menu wrapper component */
  contextMenuWrapper?: React.ReactNode;
  showArtwork?: boolean;
}

export function EntityRow({
  title,
  subtitle,
  artworkSrc,
  index,
  leading,
  trailing,
  variant,
  active,
  className,
  showArtwork = true,
  contextMenuWrapper, // Destructure to avoid passing to div
  ...props
}: EntityRowProps) {
  return (
    <div
      className={cn(rowVariants({ variant, active, className }))}
      data-active={active}
      {...props}
    >
      {/* Leading Section (Index or Icon) */}
      {(index !== undefined || leading) && (
        <div className="w-8 flex justify-center shrink-0 text-muted-foreground text-sm font-variant-numeric tabular-nums group-hover:text-foreground">
          {leading || index}
        </div>
      )}

      {/* Artwork Section */}
      {showArtwork && artworkSrc !== undefined && (
        <div className="relative shrink-0">
          <ArtworkImage
            src={artworkSrc}
            alt={title}
            className="w-10 h-10 rounded shadow-sm object-cover bg-secondary"
          />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div
          className={cn(
            "text-sm font-medium truncate",
            active && "text-primary"
          )}
        >
          {title}
        </div>
        {subtitle && (
          <div className="text-xs text-muted-foreground truncate">
            {subtitle}
          </div>
        )}
      </div>

      {/* Trailing Section */}
      {trailing && (
        <div className="flex items-center gap-2 shrink-0 text-muted-foreground text-sm">
          {trailing}
        </div>
      )}
    </div>
  );
}
