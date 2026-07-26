import { useState, useCallback, useEffect, useRef } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useSleepTimerStore } from "@/stores/sleep-timer-store";
import { cn } from "@/lib/utils";

type TimeField = "hours" | "minutes" | "seconds";

interface SleepTimerEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function clamp(value: number, min: number, max: number): number {
  if (value > max) return max;
  if (value < min) return min;
  return value;
}

const FIELDS: { key: TimeField; label: string; max: number }[] = [
  { key: "hours", label: "Hours", max: 23 },
  { key: "minutes", label: "Minutes", max: 59 },
  { key: "seconds", label: "Seconds", max: 59 },
];

export function SleepTimerEditorDialog({
  open,
  onOpenChange,
}: SleepTimerEditorDialogProps) {
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(30);
  const [seconds, setSeconds] = useState(0);
  const [activeField, setActiveField] = useState<TimeField>("minutes");
  const [inputBuffer, setInputBuffer] = useState("");
  const inputRefs = useRef<Record<TimeField, HTMLInputElement | null>>({
    hours: null,
    minutes: null,
    seconds: null,
  });

  const getValue = useCallback(
    (field: TimeField) =>
      field === "hours" ? hours : field === "minutes" ? minutes : seconds,
    [hours, minutes, seconds],
  );

  const setValue = useCallback(
    (field: TimeField, v: number) => {
      const max = field === "hours" ? 23 : 59;
      const clamped = clamp(v, 0, max);
      if (field === "hours") setHours(clamped);
      else if (field === "minutes") setMinutes(clamped);
      else setSeconds(clamped);
    },
    [],
  );

  const increment = useCallback(
    (field: TimeField) => setValue(field, getValue(field) + 1),
    [getValue, setValue],
  );

  const decrement = useCallback(
    (field: TimeField) => setValue(field, getValue(field) - 1),
    [getValue, setValue],
  );

  const handleSave = useCallback(() => {
    const totalMs = (hours * 3600 + minutes * 60 + seconds) * 1000;
    if (totalMs <= 0) return;
    useSleepTimerStore.getState().start(totalMs, "duration");
    onOpenChange(false);
  }, [hours, minutes, seconds, onOpenChange]);

  const advance = useCallback(() => {
    setActiveField((prev) => {
      if (prev === "seconds") return prev;
      return prev === "hours" ? "minutes" : "seconds";
    });
  }, []);

  useEffect(() => {
    if (open) {
      const state = useSleepTimerStore.getState();
      if (state.isActive) {
        const s = Math.floor(state.remainingMs / 1000);
        setHours(Math.floor(s / 3600));
        setMinutes(Math.floor((s % 3600) / 60));
        setSeconds(s % 60);
      } else {
        const s = Math.floor(state.lastSetMs / 1000);
        setHours(Math.floor(s / 3600));
        setMinutes(Math.floor((s % 3600) / 60));
        setSeconds(s % 60);
      }
      setActiveField("minutes");
      setInputBuffer("");
    }
  }, [open]);

  useEffect(() => {
    const input = inputRefs.current[activeField];
    if (input) {
      input.focus();
      input.select();
    }
  }, [activeField]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "ArrowUp") {
        e.preventDefault();
        increment(activeField);
        setInputBuffer("");
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        decrement(activeField);
        setInputBuffer("");
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setActiveField((prev) =>
          prev === "hours" ? "seconds" : prev === "minutes" ? "hours" : "minutes",
        );
        setInputBuffer("");
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setActiveField((prev) =>
          prev === "hours" ? "minutes" : prev === "minutes" ? "seconds" : "hours",
        );
        setInputBuffer("");
      } else if (e.key === "Enter") {
        e.preventDefault();
        advance();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, activeField, increment, decrement, advance]);

  const handleInputChange = useCallback(
    (field: TimeField, raw: string) => {
      const digits = raw.replace(/\D/g, "");
      if (digits.length <= 2) {
        setInputBuffer(digits);
        if (digits.length === 2) {
          setValue(field, parseInt(digits, 10));
          setInputBuffer("");
          advance();
        } else if (digits.length === 1) {
          setValue(field, parseInt(digits, 10));
        }
      }
    },
    [setValue, advance],
  );

  const handleInputBlur = useCallback(() => {
    setInputBuffer("");
  }, []);

  const renderField = (field: TimeField, label: string) => {
    const value = getValue(field);
    const isActive = activeField === field;

    return (
      <div className="flex flex-col items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => {
            increment(field);
            setInputBuffer("");
          }}
          aria-label={`Increase ${label}`}
          className="size-7 text-muted-foreground hover:text-foreground"
        >
          <ChevronUp size={18} />
        </Button>

        <div
          className={cn(
            "w-14 h-12 flex items-center justify-center rounded-md transition-colors",
            isActive ? "bg-accent ring-1 ring-border" : "hover:bg-accent/30",
          )}
          onClick={() => {
            setActiveField(field);
            setInputBuffer("");
          }}
        >
          {isActive ? (
            <input
              ref={(el) => { inputRefs.current[field] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={2}
              value={inputBuffer || value.toString().padStart(2, "0")}
              onChange={(e) => handleInputChange(field, e.target.value)}
              onBlur={handleInputBlur}
              onFocus={(e) => e.target.select()}
              className="w-full h-full bg-transparent text-center text-2xl font-semibold tabular-nums text-foreground outline-none caret-primary"
              aria-label={label}
            />
          ) : (
            <span className="text-2xl font-semibold tabular-nums text-muted-foreground transition-colors select-none">
              {value.toString().padStart(2, "0")}
            </span>
          )}
        </div>

        <div
          className={cn(
            "h-[3px] w-10 rounded-full transition-colors",
            isActive ? "bg-primary" : "bg-transparent",
          )}
        />

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => {
            decrement(field);
            setInputBuffer("");
          }}
          aria-label={`Decrease ${label}`}
          className="size-7 text-muted-foreground hover:text-foreground"
        >
          <ChevronDown size={18} />
        </Button>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-popover border-border text-popover-foreground max-w-xs">
        <DialogHeader>
          <DialogTitle>Set Sleep Timer</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-center py-4" role="group" aria-label="Set timer duration">
          {FIELDS.map(({ key, label }, i) => (
            <div key={key} className="flex items-center">
              {i > 0 && (
                <span className="text-2xl font-semibold text-muted-foreground mx-1 mt-8 self-start">
                  :
                </span>
              )}
              {renderField(key, label)}
            </div>
          ))}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
