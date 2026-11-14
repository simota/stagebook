import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ReactNode } from "react";

type Props<T extends { id: string }> = {
  items: T[];
  onReorder: (next: T[]) => void;
  renderItem: (item: T, index: number, handle: ReactNode) => ReactNode;
};

export function SortableList<T extends { id: string }>({ items, onReorder, renderItem }: Props<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = items.findIndex((i) => i.id === active.id);
    const to = items.findIndex((i) => i.id === over.id);
    onReorder(arrayMove(items, from, to));
  };
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        {items.map((item, i) => (
          <Row key={item.id} id={item.id}>{(handle) => renderItem(item, i, handle)}</Row>
        ))}
      </SortableContext>
    </DndContext>
  );
}

function Row({ id, children }: { id: string; children: (handle: ReactNode) => ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const handle = (
    <button type="button" className="handle" aria-label="ドラッグして並べ替え" {...attributes} {...listeners}>⠿</button>
  );
  return (
    <div ref={setNodeRef} className={`sort-row${isDragging ? " dragging" : ""}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}>
      {children(handle)}
    </div>
  );
}
