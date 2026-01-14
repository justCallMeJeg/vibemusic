import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  /** Text for the confirm/action button. Default: "Confirm" */
  confirmText?: string;
  /** Text for the cancel button. Default: "Cancel" */
  cancelText?: string;
  /**
   * Variant determines the confirm button styling.
   * - "destructive": Red button for dangerous actions (delete, quit, etc.)
   * - "primary": Primary styled button for normal confirmations
   */
  variant?: "destructive" | "primary";
  /** Callback when confirm/action is clicked */
  onConfirm: () => void;
  /** Whether the confirm action is in progress (shows loading state) */
  isLoading?: boolean;
  /** Loading text to show when isLoading is true */
  loadingText?: string;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "primary",
  onConfirm,
  isLoading = false,
  loadingText,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-popover border-border text-popover-foreground">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-3">
          <AlertDialogCancel className="bg-secondary border-border text-secondary-foreground hover:bg-accent hover:text-accent-foreground">
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            className={cn(
              "border-none",
              variant === "destructive"
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? loadingText || confirmText : confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
