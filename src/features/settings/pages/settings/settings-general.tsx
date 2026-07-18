import { Switch } from "@/components/ui/switch";
import { Settings } from "lucide-react";
import { useSettingsStore } from "@/stores/settings-store";
import { SettingsRow } from "@/components/shared/settings-row";

export function SettingsGeneral() {
  const closeToTray = useSettingsStore((s) => s.closeToTray);
  const setCloseToTray = useSettingsStore((s) => s.setCloseToTray);
  const scanOnStartup = useSettingsStore((s) => s.scanOnStartup);
  const setScanOnStartup = useSettingsStore((s) => s.setScanOnStartup);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-semibold">General</h2>
      </div>

      <div className="grid gap-6">
        <SettingsRow
          label="Close to Tray"
          description="Closing the window minimizes to tray. When music is playing, a dialog will ask whether to minimize or quit."
        >
          <Switch checked={closeToTray} onCheckedChange={setCloseToTray} />
        </SettingsRow>

        <SettingsRow
          label="Scan on Startup"
          description="Automatically scan library folders when app starts"
        >
          <Switch checked={scanOnStartup} onCheckedChange={setScanOnStartup} />
        </SettingsRow>
      </div>
    </div>
  );
}
