import { useSettingsStore } from "@/stores/settings-store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Speaker, RefreshCw } from "lucide-react";
import { useState } from "react";

export function SettingsAudio() {
  const {
    selectedDevice,
    audioDevices,
    setAudioDevice,
    refreshAudioDevices,
    crossfadeDuration,
    setCrossfadeDuration,
  } = useSettingsStore();

  const [isRefreshingDevices, setIsRefreshingDevices] = useState(false);

  const handleRefreshDevices = async () => {
    setIsRefreshingDevices(true);
    await refreshAudioDevices();
    setIsRefreshingDevices(false);
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center gap-2 mb-6">
        <Speaker className="w-5 h-5 text-purple-500" />
        <h2 className="text-xl font-semibold">Audio</h2>
      </div>

      <div className="grid gap-6">
        {/* Output Device */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/50 border border-border">
          <div className="space-y-1">
            <div className="font-medium">Output Device</div>
            <div className="text-sm text-muted-foreground">
              Select where audio should be played
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefreshDevices}
              className={isRefreshingDevices ? "animate-spin" : ""}
            >
              <RefreshCw size={16} />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-48 justify-between truncate"
                >
                  <span className="truncate">
                    {selectedDevice || "Default System Device"}
                  </span>
                  <ChevronDown className="w-4 h-4 opacity-50 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuRadioGroup
                  value={selectedDevice || ""}
                  onValueChange={(v) => setAudioDevice(v)}
                >
                  <DropdownMenuRadioItem value="">
                    Default System Device
                  </DropdownMenuRadioItem>
                  {audioDevices.map((device) => (
                    <DropdownMenuRadioItem
                      key={device.name}
                      value={device.name}
                    >
                      {device.name}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Crossfade Setting */}
        <div className="flex items-start justify-between p-4 rounded-xl bg-secondary/50 border border-border">
          <div className="space-y-1">
            <div className="font-medium">Crossfade</div>
            <div className="text-sm text-muted-foreground">
              Overlap songs by specifying duration in milliseconds.
            </div>
            <div className="text-xs text-muted-foreground/70 pt-1">
              Tip: 1000ms = 1 second
            </div>
          </div>
          <div className="w-48 space-y-2">
            <div className="flex items-center gap-2">
              <Input
                type="text"
                value={crossfadeDuration}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^\d*$/.test(val)) {
                    setCrossfadeDuration(Number(val));
                  }
                }}
                className="bg-card border-border text-right font-mono"
                placeholder="0"
              />
              <span className="text-sm text-muted-foreground font-medium">
                ms
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
