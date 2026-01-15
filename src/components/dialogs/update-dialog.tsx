import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useUpdateStore } from "@/stores/update-store";
import { Download } from "lucide-react";
import ReactMarkdown from "react-markdown";

export function UpdateDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { updateManifest, download, error } = useUpdateStore();
  const isDownloading = useUpdateStore((s) => s.isDownloading);

  const handleDownload = async () => {
    onOpenChange(false); // Close dialog immediately
    await download(); // Start background download
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col bg-popover border-border text-popover-foreground">
        <DialogHeader>
          <DialogTitle className="text-xl">New Version Available</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Version {updateManifest?.version} is ready to download.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto my-4 p-4 rounded-md bg-card border border-border">
          <div
            className="prose prose-invert prose-sm max-w-none
            prose-headings:text-indigo-400 prose-headings:font-semibold prose-headings:border-b prose-headings:border-border prose-headings:pb-2 prose-headings:mb-3
            prose-h1:text-lg prose-h2:text-base prose-h3:text-sm
            prose-p:text-muted-foreground prose-p:leading-relaxed
            prose-a:text-indigo-400 prose-a:no-underline
            prose-strong:text-foreground prose-strong:font-semibold
            prose-code:text-indigo-300 prose-code:bg-secondary/50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs
            prose-pre:bg-background/50 prose-pre:border prose-pre:border-border
            prose-ul:text-muted-foreground prose-ol:text-muted-foreground
            prose-li:marker:text-indigo-400
            prose-blockquote:border-l-indigo-500 prose-blockquote:bg-indigo-500/5 prose-blockquote:text-muted-foreground prose-blockquote:not-italic prose-blockquote:py-1"
          >
            {updateManifest?.body ? (
              <ReactMarkdown>{updateManifest.body}</ReactMarkdown>
            ) : (
              <p className="text-muted-foreground italic">
                No changelog provided.
              </p>
            )}
          </div>
        </div>

        {error && (
          <div className="text-red-400 text-sm mb-4 px-1">Error: {error}</div>
        )}

        <DialogFooter>
          <div className="flex gap-2 justify-end w-full">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isDownloading}
              className="text-muted-foreground hover:text-foreground hover:bg-accent"
            >
              Later
            </Button>
            <Button
              onClick={handleDownload}
              disabled={isDownloading}
              className="bg-indigo-600 hover:bg-indigo-700 min-w-[140px]"
            >
              <Download className="mr-2 h-4 w-4" />
              Download Update
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
