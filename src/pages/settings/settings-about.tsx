import { Button } from "@/components/ui/button";
import { useUpdateStore } from "@/stores/update-store";
import { Loader2, CheckCircle2 } from "lucide-react";
import { getVersion } from "@tauri-apps/api/app";
import { useEffect, useState } from "react";
import { UpdateDialog } from "@/components/dialogs/update-dialog";
import { cn } from "@/lib/utils";

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

export function SettingsAbout() {
  const [appVersion, setAppVersion] = useState("0.0.0");
  const { check, isUpdateAvailable } = useUpdateStore();
  const isChecking = useUpdateStore((s) => s.isChecking);
  const lastChecked = useUpdateStore((s) => s.lastChecked);
  const channel = useUpdateStore((s) => s.channel);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [warningOpen, setWarningOpen] = useState(false);

  useEffect(() => {
    getVersion().then(setAppVersion);
  }, []);

  const handleCheck = async () => {
    const hasUpdate = await check();
    if (hasUpdate) {
      setDialogOpen(true);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight text-white/90">
          About
        </h2>
        <p className="text-white/50">
          Application information and update management.
        </p>
      </div>

      <div className="p-6 rounded-xl bg-white/5 border border-white/10 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="font-medium">Update Channel</h3>
            <p className="text-sm text-muted-foreground">
              Choose between Stable releases or Nightly builds.
            </p>
          </div>
          <div className="flex bg-neutral-900 p-1 rounded-lg border border-neutral-800">
            {(["stable", "dev"] as const).map((ch) => (
              <button
                key={ch}
                onClick={() => {
                  if (ch === "dev" && channel !== "dev") {
                    setWarningOpen(true);
                  } else {
                    useUpdateStore.getState().setChannel(ch);
                  }
                }}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-md transition-all capitalize",
                  channel === ch
                    ? "bg-neutral-800 text-white shadow-sm"
                    : "text-neutral-400 hover:text-white"
                )}
              >
                {ch}
              </button>
            ))}
          </div>
        </div>

        <AlertDialog open={warningOpen} onOpenChange={setWarningOpen}>
          <AlertDialogContent className="bg-neutral-900 border-neutral-800 text-white">
            <AlertDialogHeader>
              <AlertDialogTitle>Switch to Dev Channel?</AlertDialogTitle>
              <AlertDialogDescription className="text-neutral-400">
                The content in the <strong>Dev</strong> channel is experimental.
                Using it might cause the app to behave unexpectedly or break
                features.
                <br />
                <br />
                Because we're testing new features, the database structure might
                change, which could lead to{" "}
                <strong>loss of your playlists or library data</strong>.
                <br />
                <br />
                We recommend sticking to the <strong>Stable</strong> channel for
                daily use.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-neutral-700 hover:bg-neutral-800 hover:text-white text-neutral-300">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700 text-white border-none"
                onClick={() => {
                  useUpdateStore.getState().setChannel("dev");
                  setWarningOpen(false);
                }}
              >
                Switch Anyway
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <div className="flex items-center justify-between pt-4 border-t border-neutral-800">
          <div>
            <h3 className="text-lg font-medium text-white">vibemusic</h3>
            <p className="text-sm text-white/50">Version {appVersion}</p>
          </div>
          <div className="text-right">
            <Button
              variant="outline"
              onClick={handleCheck}
              disabled={isChecking}
              className="bg-white/5 border-white/10 hover:bg-white/10 text-white min-w-[140px]"
            >
              {isChecking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking...
                </>
              ) : isUpdateAvailable ? (
                "View Update"
              ) : (
                "Check for Updates"
              )}
            </Button>
            {lastChecked && !isChecking && !isUpdateAvailable && (
              <p className="text-xs text-white/30 mt-2 flex items-center justify-end gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Up to date
              </p>
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-white/10">
          <p className="text-sm text-white/40">
            Current Channel:{" "}
            <span className="text-white/70 capitalize">
              {channel === "dev" ? "Nightly (Dev)" : "Stable Release"}
            </span>
          </p>
        </div>
      </div>

      <UpdateDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
