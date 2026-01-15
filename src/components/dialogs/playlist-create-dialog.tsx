import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLibraryStore } from "@/stores/library-store";
import { StandardDialog } from "@/components/shared/standard-dialog";

interface PlaylistCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PlaylistCreateDialog({
  open,
  onOpenChange,
}: PlaylistCreateDialogProps) {
  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const createPlaylist = useLibraryStore((s) => s.createPlaylist);

  const handleCreate = async () => {
    if (!name.trim()) return;

    setIsCreating(true);
    const success = await createPlaylist(name);
    setIsCreating(false);

    if (success) {
      setName("");
      onOpenChange(false);
    }
  };

  const footer = (
    <>
      <Button
        variant="ghost"
        onClick={() => onOpenChange(false)}
        className="text-muted-foreground hover:text-foreground hover:bg-accent"
      >
        Cancel
      </Button>
      <Button
        onClick={handleCreate}
        disabled={isCreating || !name.trim()}
        className="bg-primary text-primary-foreground hover:bg-primary/90"
      >
        {isCreating ? "Creating..." : "Create Playlist"}
      </Button>
    </>
  );

  return (
    <StandardDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Create Playlist"
      description="Give your playlist a name to get started."
      footer={footer}
      contentClassName="sm:max-w-[425px]"
    >
      <div className="grid gap-4 py-4">
        <div className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name" className="text-left text-muted-foreground">
              Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My awesome playlist"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
              }}
            />
          </div>
        </div>
      </div>
    </StandardDialog>
  );
}
