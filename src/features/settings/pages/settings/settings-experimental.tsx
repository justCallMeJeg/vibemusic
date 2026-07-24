import { Switch } from "@/components/ui/switch";
import { FlaskConical } from "lucide-react";
import { useSettingsStore } from "@/stores/settings-store";
import { SettingsRow } from "@/components/shared/settings-row";
import { SettingsGroup } from "@/components/shared/settings-group";
import { SettingsSection } from "@/components/shared/settings-section";

export function SettingsExperimental() {
  const experimentalFeatures = useSettingsStore((s) => s.experimentalFeatures);
  const setExperimentalFeature = useSettingsStore(
    (s) => s.setExperimentalFeature,
  );

  return (
    <SettingsSection
      icon={FlaskConical}
      title="Experimental"
      description="Work-in-progress features. Disabled by default and subject to change or removal."
    >
      <SettingsGroup
        title="Keyboard Navigation"
        description="Arrow keys in lists and grids, app-wide shortcuts (Ctrl+1-8, Space, etc.), section and cross-column navigation, and context menu key. Disable to restore pure mouse/Tab interaction."
        headerAction={
          <Switch
            checked={experimentalFeatures.keyboardNav}
            onCheckedChange={(checked) =>
              setExperimentalFeature("keyboardNav", checked)
            }
          />
        }
      >
        {experimentalFeatures.keyboardNav && (
          <SettingsGroup
            title="Focus Region Navigation"
            description="Tab and Shift+Tab cycle between Sidebar, Main Content, Player, and Side Panel regions. Ctrl+L jumps to main content."
            headerAction={
              <Switch
                checked={experimentalFeatures.focusRegions}
                onCheckedChange={(checked) =>
                  setExperimentalFeature("focusRegions", checked)
                }
              />
            }
          >
            {experimentalFeatures.focusRegions && (
              <SettingsRow
                label="Show Focus Region Indicator"
                description="Display a subtle outline on the currently active focus region."
                variant="nested"
              >
                <Switch
                  checked={experimentalFeatures.showFocusIndicator}
                  onCheckedChange={(checked) =>
                    setExperimentalFeature("showFocusIndicator", checked)
                  }
                />
              </SettingsRow>
            )}
          </SettingsGroup>
        )}
      </SettingsGroup>
    </SettingsSection>
  );
}
