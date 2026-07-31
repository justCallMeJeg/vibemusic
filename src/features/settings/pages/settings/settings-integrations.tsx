import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { PlugZap, Link, Link2Off, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { SettingsRow } from "@/components/shared/settings-row";
import { SettingsSection } from "@/components/shared/settings-section";
import { Button } from "@/components/ui/button";
import { useSettingsStore } from "@/stores/settings-store";
import { logger } from "@/lib/logger";

interface AvailableFeatures {
  scrobbler: boolean;
  discord_rpc: boolean;
}

export function SettingsIntegrations({
  features,
}: {
  features: AvailableFeatures;
}) {
  const discordRpcEnabled = useSettingsStore((s) => s.discordRpcEnabled);
  const setDiscordRpcEnabled = useSettingsStore((s) => s.setDiscordRpcEnabled);

  const lastfmEnabled = useSettingsStore((s) => s.lastfmEnabled);
  const lastfmUsername = useSettingsStore((s) => s.lastfmUsername);
  const setLastfmEnabled = useSettingsStore((s) => s.setLastfmEnabled);
  const setLastfmCredentials = useSettingsStore(
    (s) => s.setLastfmCredentials,
  );
  const disconnectLastfm = useSettingsStore((s) => s.disconnectLastfm);

  const [connecting, setConnecting] = useState(false);

  const handleConnectLastfm = async () => {
    setConnecting(true);
    try {
      const [sessionKey, username] = await invoke<[string, string]>(
        "lastfm_start_auth",
      );
      await setLastfmCredentials(sessionKey, username);
      await setLastfmEnabled(true);
    } catch (e) {
      logger.error("[integrations] Last.fm auth failed:", e);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnectLastfm = async () => {
    await disconnectLastfm();
  };

  const hasAnyFeature = features.discord_rpc || features.scrobbler;

  return (
    <SettingsSection icon={PlugZap} title="Integrations">
      {!hasAnyFeature && (
        <p className="text-sm text-muted-foreground py-2">
          No integrations are compiled in this build.
        </p>
      )}

      {features.discord_rpc && (
        <>
          <SettingsRow
            label="Discord Rich Presence"
            description="Show currently playing track on your Discord profile"
          >
            <Switch
              checked={discordRpcEnabled}
              onCheckedChange={setDiscordRpcEnabled}
            />
          </SettingsRow>
        </>
      )}

      {features.scrobbler && (
        <SettingsRow
          label="Last.fm Scrobbling"
          description={
            lastfmEnabled && lastfmUsername
              ? `Connected as ${lastfmUsername}`
              : "Scrobble your listening history to Last.fm"
          }
          layout="start"
        >
          <div className="flex items-center gap-2 shrink-0">
            {lastfmEnabled && lastfmUsername ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisconnectLastfm}
              >
                <Link2Off className="size-3.5 mr-1.5" />
                Disconnect
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleConnectLastfm}
                disabled={connecting}
              >
                {connecting ? (
                  <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Link className="size-3.5 mr-1.5" />
                )}
                {connecting ? "Connecting..." : "Connect"}
              </Button>
            )}
          </div>
        </SettingsRow>
      )}
    </SettingsSection>
  );
}
