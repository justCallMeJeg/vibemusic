import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface ScrollingTextProps extends React.HTMLAttributes<HTMLDivElement> {
  children: string;
}

export function ScrollingText({
  children,
  className,
  ...props
}: ScrollingTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current && textRef.current) {
        setIsOverflowing(
          textRef.current.scrollWidth > containerRef.current.clientWidth
        );
      }
    };

    checkOverflow();
    window.addEventListener("resize", checkOverflow);
    return () => window.removeEventListener("resize", checkOverflow);
  }, [children]);

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-hidden whitespace-nowrap", className)}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      {...props}
    >
      <div
        ref={textRef}
        className={cn(
          "inline-block transition-transform duration-1000 ease-linear will-change-transform",
          isOverflowing && isHovering && "animate-scroll-text"
        )}
        style={
          isOverflowing && isHovering
            ? {
                animationDuration: `${children.length * 150}ms`,
              }
            : undefined
        }
      >
        <span className="inline-block pr-8">{children}</span>
        {isOverflowing && isHovering && (
          <span className="inline-block pr-8">{children}</span>
        )}
      </div>
    </div>
  );
}
