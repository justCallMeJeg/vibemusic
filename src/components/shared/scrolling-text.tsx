import { memo, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface ScrollingTextProps extends React.HTMLAttributes<HTMLDivElement> {
  children: string;
  trigger?: "hover" | "always";
}

export const ScrollingText = memo(function ScrollingText({
  children,
  className,
  trigger: triggerProp = "hover",
  ...props
}: ScrollingTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current && textRef.current) {
        const textEl = textRef.current.firstElementChild;
        const textWidth = textEl
          ? textEl.scrollWidth
          : textRef.current.scrollWidth;
        setIsOverflowing(textWidth >= containerRef.current.clientWidth);
      }
    };

    checkOverflow();
    const observer = new ResizeObserver(checkOverflow);
    if (containerRef.current?.parentElement) {
      observer.observe(containerRef.current.parentElement);
    }
    return () => observer.disconnect();
  }, [children]);

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-hidden whitespace-nowrap", className)}
      {...props}
    >
      <div
        ref={textRef}
        className={cn(
          "inline-block transition-transform will-change-transform",
          triggerProp === "always"
            ? isOverflowing &&
                "motion-safe:animate-scroll-text motion-safe:group-data-[selected=true]:animate-scroll-text"
            : isOverflowing &&
                "motion-safe:hover:animate-scroll-text motion-safe:group-hover:animate-scroll-text motion-safe:group-data-[selected=true]:animate-scroll-text",
        )}
        style={
          isOverflowing
            ? {
                animationDuration: `${Math.min(children.length * 150, 10000)}ms`,
              }
            : undefined
        }
      >
        <span className="inline-block pr-8">{children}</span>
        {isOverflowing && (
          <span aria-hidden="true" className="inline-block pr-8">
            {children}
          </span>
        )}
      </div>
    </div>
  );
});
