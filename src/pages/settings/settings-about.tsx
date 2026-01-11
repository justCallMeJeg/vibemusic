import { Button } from "@/components/ui/button";
import { useUpdateStore } from "@/stores/update-store";
import { Loader2, CheckCircle2 } from "lucide-react";
import { getVersion } from "@tauri-apps/api/app";
import { useEffect, useState } from "react";
import { UpdateDialog } from "@/components/dialogs/update-dialog";

export function SettingsAbout() {
  const [appVersion, setAppVersion] = useState("0.0.0");
  const { check, isChecking, lastChecked, isUpdateAvailable } =
    useUpdateStore();
  const [dialogOpen, setDialogOpen] = useState(false);

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
            Current Channel: <span className="text-white/70">Release</span>
          </p>
        </div>
      </div>

      <UpdateDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
