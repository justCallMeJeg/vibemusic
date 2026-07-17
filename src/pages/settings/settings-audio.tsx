import { useSettingsStore } from "@/stores/settings-store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
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
  const selectedDevice = useSettingsStore((s) => s.selectedDevice);
  const audioDevices = useSettingsStore((s) => s.audioDevices);
  const setAudioDevice = useSettingsStore((s) => s.setAudioDevice);
  const refreshAudioDevices = useSettingsStore((s) => s.refreshAudioDevices);
  const crossfadeDuration = useSettingsStore((s) => s.crossfadeDuration);
  const setCrossfadeDuration = useSettingsStore((s) => s.setCrossfadeDuration);
  const fadeInOutEnabled = useSettingsStore((s) => s.fadeInOutEnabled);
  const fadeInOutDuration = useSettingsStore((s) => s.fadeInOutDuration);
  const setFadeInOut = useSettingsStore((s) => s.setFadeInOut);

  const [isRefreshingDevices, setIsRefreshingDevices] = useState(false);

  const handleRefreshDevices = async () => {
    setIsRefreshingDevices(true);
    await refreshAudioDevices();
    setIsRefreshingDevices(false);
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center gap-2 mb-6">
        <Speaker className="w-5 h-5 text-primary" />
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

        {/* Fade In/Out */}
        <div className="flex-col items-start p-4 rounded-xl bg-secondary/50 border border-border">
          <div className="flex justify-between">
            <div className="gap-1 pr-4">
              <div className="font-medium">Fade in/out on play/pause</div>
              <div className="text-sm text-muted-foreground">
                Smoothly fade audio when playing or pausing a track.
              </div>
            </div>
            <Switch
              checked={fadeInOutEnabled}
              onCheckedChange={(checked) =>
                setFadeInOut(checked, fadeInOutDuration)
              }
            />
          </div>
          {fadeInOutEnabled && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <span className="h-full text-xs text-muted-foreground font-mono w-8">
                {(fadeInOutDuration / 1000).toFixed(1)}s
              </span>
              <Slider
                className="flex-1 w-full"
                min={100}
                max={3000}
                step={100}
                value={[fadeInOutDuration]}
                onValueChange={([v]) => setFadeInOut(true, v)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
