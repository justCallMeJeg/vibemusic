import { useSettingsStore } from "@/stores/settings-store";
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
import { SettingsRow } from "@/components/shared/settings-row";
import { SettingsGroup } from "@/components/shared/settings-group";

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

  const crossfadeEnabled = crossfadeDuration > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Speaker className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-semibold">Audio</h2>
      </div>

      <div className="grid gap-6">
        <SettingsRow
          label="Output Device"
          description="Select where audio should be played"
        >
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleRefreshDevices}>
              <RefreshCw
                size={16}
                className={isRefreshingDevices ? "animate-spin" : ""}
              />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-48 justify-between truncate">
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
                  <DropdownMenuRadioItem value="">Default System Device</DropdownMenuRadioItem>
                  {audioDevices.map((device) => (
                    <DropdownMenuRadioItem key={device.name} value={device.name}>
                      {device.name}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </SettingsRow>

        <SettingsGroup
          title="Crossfade"
          description="Overlap songs by specifying duration in milliseconds."
          headerAction={
            <Switch
              checked={crossfadeEnabled}
              onCheckedChange={(checked) =>
                setCrossfadeDuration(checked ? 3000 : 0)
              }
            />
          }
        >
          {crossfadeEnabled && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground font-mono w-8">
                {crossfadeDuration >= 1000
                  ? `${(crossfadeDuration / 1000).toFixed(1)}s`
                  : `${crossfadeDuration}ms`}
              </span>
              <Slider
                className="flex-1"
                min={500}
                max={12000}
                step={500}
                value={[crossfadeDuration]}
                onValueChange={([v]) => setCrossfadeDuration(v)}
              />
            </div>
          )}
        </SettingsGroup>

        <SettingsGroup
          title="Fade in/out on play/pause"
          description="Smoothly fade audio when playing or pausing a track."
          headerAction={
            <Switch
              checked={fadeInOutEnabled}
              onCheckedChange={(checked) =>
                setFadeInOut(checked, fadeInOutDuration)
              }
            />
          }
        >
          {fadeInOutEnabled && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground font-mono w-8">
                {(fadeInOutDuration / 1000).toFixed(1)}s
              </span>
              <Slider
                className="flex-1"
                min={100}
                max={3000}
                step={100}
                value={[fadeInOutDuration]}
                onValueChange={([v]) => setFadeInOut(true, v)}
              />
            </div>
          )}
        </SettingsGroup>
      </div>
    </div>
  );
}
