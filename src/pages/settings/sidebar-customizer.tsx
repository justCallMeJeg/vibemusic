import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useSettingsStore, SidebarItem } from "@/stores/settings-store";
import { GripVertical, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";

function SortableItem({
  item,
  onToggle,
}: {
  item: SidebarItem;
  onToggle: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const labels: Record<string, string> = {
    home: "Home",
    search: "Search",
    songs: "Songs",
    albums: "Albums",
    playlists: "Playlists",
    settings: "Settings",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg border border-border group"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab hover:text-foreground text-muted-foreground"
      >
        <GripVertical size={16} />
      </div>
      <span className="flex-1 font-medium capitalize">
        {labels[item.id] || item.id}
      </span>
      {item.id !== "settings" && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className={item.hidden ? "text-muted-foreground" : "text-foreground"}
        >
          {item.hidden ? <EyeOff size={16} /> : <Eye size={16} />}
        </Button>
      )}
    </div>
  );
}

export function SidebarCustomizer() {
  const { sidebarItems, setSidebarItems } = useSettingsStore();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sidebarItems.findIndex((i) => i.id === active.id);
      const newIndex = sidebarItems.findIndex((i) => i.id === over.id);
      setSidebarItems(arrayMove(sidebarItems, oldIndex, newIndex));
    }
  };

  const handleToggle = (id: string) => {
    if (id === "settings") return; // Prevent hiding settings
    const newItems = sidebarItems.map((item) =>
      item.id === id ? { ...item, hidden: !item.hidden } : item
    );
    setSidebarItems(newItems);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={sidebarItems.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2">
          {sidebarItems.map((item) => (
            <SortableItem
              key={item.id}
              item={item}
              onToggle={() => handleToggle(item.id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
