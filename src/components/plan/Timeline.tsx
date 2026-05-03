'use client';

import { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Spot } from '@/types';
import SpotCard from './SpotCard';

interface Props {
  spots: Spot[];
  dayColor: string;
  onToggleCheck: (spotId: string) => void;
  onTimeEdit: (spotId: string, time: string) => void;
  onNoteEdit?: (spotId: string, note: string) => void;
  onDelete?: (spotId: string) => void;
  onReorder?: (fromIdx: number, toIdx: number) => void;
}

export default function Timeline({
  spots, dayColor, onToggleCheck, onTimeEdit, onNoteEdit, onDelete, onReorder,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Sensors:
  // - PointerSensor (desktop mouse)  — drag begins after 6px movement so clicks still work
  // - TouchSensor (mobile)           — long-press 250ms with 5px tolerance
  // - KeyboardSensor                 — accessibility (arrow keys when focused)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  if (spots.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🗺️</div>
        <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>ยังไม่มีสถานที่</p>
        <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>ค้นหาและเพิ่มสถานที่ด้านบน</p>
      </div>
    );
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const fromIdx = spots.findIndex((s) => s.id === active.id);
    const toIdx = spots.findIndex((s) => s.id === over.id);
    if (fromIdx < 0 || toIdx < 0 || !onReorder) return;
    onReorder(fromIdx, toIdx);
  };

  // Optimistic preview during drag — let dnd-kit handle visual reordering
  const ids = spots.map((s) => s.id);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div>
          {spots.map((spot, i) => (
            <SortableRow
              key={spot.id}
              id={spot.id}
              enabled={!!onReorder}
            >
              {(dragHandleProps) => (
                <SpotCard
                  spot={spot}
                  index={i}
                  dayColor={dayColor}
                  selected={selectedId === spot.id}
                  onSelect={() => setSelectedId((prev) => (prev === spot.id ? null : spot.id))}
                  onToggleCheck={onToggleCheck}
                  onTimeEdit={onTimeEdit}
                  onNoteEdit={onNoteEdit}
                  onDelete={onDelete}
                  draggable={!!onReorder}
                  dragHandleProps={dragHandleProps}
                />
              )}
            </SortableRow>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

/* ─────────────────────────────────────────────────────────────
   SortableRow — wraps useSortable; passes only the listeners
   to the drag handle inside SpotCard, so the rest of the card
   remains tap-to-edit.
   ───────────────────────────────────────────────────────────── */
interface SortableRowProps {
  id: string;
  enabled: boolean;
  children: (handleProps: {
    attributes: ReturnType<typeof useSortable>['attributes'];
    listeners: ReturnType<typeof useSortable>['listeners'];
  }) => React.ReactNode;
}

function SortableRow({ id, enabled, children }: SortableRowProps) {
  const sortable = useSortable({ id, disabled: !enabled });
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = sortable;

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 'auto',
    position: 'relative',
  };

  return (
    <div ref={setNodeRef} style={style}>
      {children({ attributes, listeners })}
    </div>
  );
}
