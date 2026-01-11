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
import { Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

export function UpdateDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { updateManifest, isChecking, install, error } = useUpdateStore();

  const handleInstall = async () => {
    await install();
    // Dialog stays open to show spinner/error
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col bg-neutral-900 border-neutral-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl">New Version Available</DialogTitle>
          <DialogDescription className="text-gray-400">
            Version {updateManifest?.version} is ready to install.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto my-4 p-4 rounded-md bg-neutral-950 border border-neutral-800">
          <div className="prose prose-invert prose-sm max-w-none">
            {updateManifest?.body ? (
              <ReactMarkdown>{updateManifest.body}</ReactMarkdown>
            ) : (
              <p className="text-gray-500 italic">No changelog provided.</p>
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
              disabled={isChecking}
              className="hover:bg-white/10"
            >
              Later
            </Button>
            <Button
              onClick={handleInstall}
              disabled={isChecking}
              className="bg-indigo-600 hover:bg-indigo-700 min-w-[100px]"
            >
              {isChecking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Now"
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
