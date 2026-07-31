import { useRef, useEffect, type RefObject } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { SortDropdown } from "@/components/shared/sort-dropdown";
import { cn } from "@/lib/utils";

interface PageSearchAndSortProps {
  searchPlaceholder: string;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  searchInputRef?: RefObject<HTMLInputElement | null>;
  isLoading: boolean;
  sortKey: string;
  sortDirection: "asc" | "desc";
  onSortChange: (key: string, dir: "asc" | "desc") => void;
  sortOptions: { label: string; value: string }[];
  extraButtons?: React.ReactNode;
}

export function PageSearchAndSort({
  searchPlaceholder,
  searchQuery,
  onSearchChange,
  searchInputRef: externalRef,
  isLoading,
  sortKey,
  sortDirection,
  onSortChange,
  sortOptions,
  extraButtons,
}: PageSearchAndSortProps) {
  const internalRef = useRef<HTMLInputElement>(null);
  const inputRef = externalRef || internalRef;

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && searchQuery) {
        onSearchChange("");
        input.blur();
      }
    };
    input.addEventListener("keydown", handler);
    return () => input.removeEventListener("keydown", handler);
  }, [searchQuery, onSearchChange, inputRef]);

  return (
    <div className={cn(
      "flex items-center justify-between gap-4 mb-4",
      isLoading && "pointer-events-none opacity-50",
    )}>
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          placeholder={searchPlaceholder}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          disabled={isLoading}
          className="pl-9"
          autoComplete="off"
        />
      </div>
      <div className="flex items-center gap-2">
        {extraButtons}
        <SortDropdown
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSortChange={onSortChange}
          options={sortOptions}
        />
      </div>
    </div>
  );
}