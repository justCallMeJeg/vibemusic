import { Button } from "@/components/ui/button";
import { useUpdateStore } from "@/stores/update-store";
import { Download, X } from "lucide-react";
import { lazy, Suspense } from "react";
import { logger } from "@/lib/logger";
import { StandardDialog } from "@/components/shared/standard-dialog";

const ReactMarkdown = lazy(() => import("react-markdown"));

export function UpdateDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { updateManifest, latestRelease, currentVersionChangelog, currentVersionChangelogVersion, download, error } = useUpdateStore();
  const isDownloading = useUpdateStore((s) => s.isDownloading);

  const hasUpdate = !!updateManifest;
  const isShowingCurrentChangelog = !!currentVersionChangelog;
  const hasContent = !!(updateManifest ?? latestRelease ?? currentVersionChangelog);

  const handleDownload = async () => {
    onOpenChange(false);
    try {
      await download();
    } catch (e) {
      logger.error("Download failed", e);
    }
  };

  const release = updateManifest ?? latestRelease;
  const changelogBody = isShowingCurrentChangelog ? currentVersionChangelog : release?.body;

  const title = isShowingCurrentChangelog
    ? `What's New in v${currentVersionChangelogVersion}`
    : hasUpdate
      ? "New Version Available"
      : "What's New";

  const description = isShowingCurrentChangelog
    ? `Release notes for version ${currentVersionChangelogVersion}`
    : hasUpdate
      ? `Version ${release?.version} is ready to download.`
      : `Latest version: ${release?.version}`;

  const footer = isShowingCurrentChangelog ? (
    <div className="flex gap-2 justify-end w-full">
      <Button
        variant="ghost"
        onClick={() => onOpenChange(false)}
        className="text-muted-foreground hover:text-foreground hover:bg-accent"
      >
        <X className="mr-2 h-4 w-4" />
        Close
      </Button>
    </div>
  ) : hasUpdate ? (
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
        variant="default"
        className="min-w-[140px]"
      >
        <Download className="mr-2 h-4 w-4" />
        Download Update
      </Button>
    </div>
  ) : (
    <div className="flex gap-2 justify-end w-full">
      <Button
        variant="ghost"
        onClick={() => onOpenChange(false)}
        className="text-muted-foreground hover:text-foreground hover:bg-accent"
      >
        <X className="mr-2 h-4 w-4" />
        Close
      </Button>
    </div>
  );

  return (
    <StandardDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      footer={footer}
      contentClassName="max-w-2xl max-h-[80vh] flex flex-col"
      className="flex flex-col flex-1 min-h-0"
    >
      <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 my-4 p-4 rounded-md bg-card border border-border">
        {!hasContent ? (
          <p className="text-muted-foreground italic">
            No release information available.
          </p>
        ) : !changelogBody ? (
          <p className="text-muted-foreground italic">
            No changelog provided.
          </p>
        ) : (
          <div
            className="prose prose-invert prose-sm max-w-none wrap-break-word
              prose-headings:text-primary prose-headings:font-semibold prose-headings:border-b prose-headings:border-border prose-headings:pb-2 prose-headings:mb-3
              prose-h1:text-lg prose-h2:text-base prose-h3:text-sm
              prose-p:text-muted-foreground prose-p:leading-relaxed
              prose-a:text-primary prose-a:no-underline
              prose-strong:text-foreground prose-strong:font-semibold
              prose-code:text-primary prose-code:bg-secondary/50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs
              prose-pre:bg-background/50 prose-pre:border prose-pre:border-border
              prose-ul:text-muted-foreground prose-ol:text-muted-foreground
              prose-li:marker:text-primary
              prose-blockquote:border-l-primary prose-blockquote:bg-primary/5 prose-blockquote:text-muted-foreground prose-blockquote:not-italic prose-blockquote:py-1"
          >
            <Suspense fallback={<p className="text-muted-foreground italic">Loading changelog...</p>}>
              <ReactMarkdown>{changelogBody}</ReactMarkdown>
            </Suspense>
          </div>
        )}
      </div>

      {error && (
        <div className="text-destructive text-sm mb-4 px-1">Error: {error}</div>
      )}
    </StandardDialog>
  );
}
