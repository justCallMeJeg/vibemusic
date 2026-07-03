import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "bg-accent motion-safe:animate-pulse motion-reduce:bg-foreground/5 rounded-md will-change-opacity",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
