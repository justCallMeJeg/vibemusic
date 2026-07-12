import { Button } from "@/components/ui/button";
import { useUpdateStore } from "@/stores/update-store";
import { Download, ExternalLink } from "lucide-react";
import { StandardDialog } from "@/components/shared/standard-dialog";

const formatLabels: Record<string, string> = {
  exe: ".exe (Windows NSIS)",
  deb: ".deb (Linux)",
  rpm: ".rpm (Linux)",
  unknown: "Unknown",
};

export function ManualUpdateDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { updateManifest, installFormat, openDownloadPage } = useUpdateStore();
  const formatLabel = formatLabels[installFormat] ?? installFormat;

  return (
    <StandardDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Manual Update Required"
      description={
        updateManifest
          ? `Version ${updateManifest.version} is available.`
          : "A new version is available."
      }
      footer={
        <div className="flex gap-2 justify-end w-full">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground hover:text-foreground hover:bg-accent"
          >
            Later
          </Button>
          <Button
            onClick={() => {
              onOpenChange(false);
              openDownloadPage();
            }}
            variant="default"
            className="min-w-[140px]"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Download from GitHub
          </Button>
        </div>
      }
      contentClassName="max-w-lg"
    >
      <div className="space-y-4 py-2">
        <div className="flex items-start gap-3 p-3 rounded-md bg-amber-500/10 border border-amber-500/20">
          <div className="mt-0.5 shrink-0 text-amber-400">
            <Download className="h-5 w-5" />
          </div>
          <div className="text-sm text-amber-200 space-y-1">
            <p className="font-medium text-amber-100">
              Auto-update not supported for {formatLabel}
            </p>
            <p>
              Your current installation format doesn't support automatic
              updates. You'll be redirected to GitHub in your browser to
              download the new version manually.
            </p>
          </div>
        </div>
      </div>
    </StandardDialog>
  );
}
