import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowUpDown } from "lucide-react";

export type SortDirection = "asc" | "desc";

export interface SortOption {
  label: string;
  value: string;
}

interface SortDropdownProps {
  sortKey: string;
  sortDirection: string;
  onSortChange: (key: string, direction: SortDirection) => void;
  options: SortOption[];
}

export function SortDropdown({
  sortKey,
  sortDirection,
  onSortChange,
  options,
}: SortDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2">
          <ArrowUpDown className="h-4 w-4" />
          Sort
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Sort By</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={sortKey}
          onValueChange={(v) => onSortChange(v, sortDirection as SortDirection)}
        >
          {options.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Order</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={sortDirection}
          onValueChange={(v) => onSortChange(sortKey, v as SortDirection)}
        >
          <DropdownMenuRadioItem value="asc">Ascending</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="desc">Descending</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
