import { Keyboard } from "lucide-react";
import { SettingsSection } from "@/components/shared/settings-section";
import { SettingsRow } from "@/components/shared/settings-row";
import { Button } from "@/components/ui/button";
import { useKeybindDialogStore } from "@/stores/keybind-dialog-store";

export function SettingsKeyboard() {
  const setOpen = useKeybindDialogStore((s) => s.setOpen);

  return (
    <SettingsSection
      icon={Keyboard}
      title="Keyboard"
      description="View and customize all keyboard shortcuts."
    >
      <SettingsRow
        label="Customize Shortcuts"
        description="Open the editor to view or rebind any shortcut."
      >
        <Button variant="outline" onClick={() => setOpen(true)}>
          Open Shortcuts Editor
        </Button>
      </SettingsRow>
    </SettingsSection>
  );
}
