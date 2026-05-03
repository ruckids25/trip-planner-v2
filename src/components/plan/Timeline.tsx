'use client';

import { useState } from 'react';
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
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (spots.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🗺️</div>
        <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>ยังไม่มีสถานที่</p>
        <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>ค้นหาและเพิ่มสถานที่ด้านบน</p>
      </div>
    );
  }

  return (
    <div>
      {spots.map((spot, i) => (
        <SpotCard
          key={spot.id}
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
          onDragStart={() => setDragIdx(i)}
          onDragOver={(e) => { e.preventDefault(); setOverIdx(i); }}
          onDrop={() => {
            if (dragIdx !== null && dragIdx !== i) onReorder?.(dragIdx, i);
            setDragIdx(null);
            setOverIdx(null);
          }}
          onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}
          isDragging={dragIdx === i}
          isOver={overIdx === i && dragIdx !== i}
        />
      ))}
    </div>
  );
}
