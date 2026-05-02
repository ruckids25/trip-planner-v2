'use client';

import { useState } from 'react';
import { Spot } from '@/types';
import SpotCard from './SpotCard';

interface TimelineProps {
  spots: Spot[];
  dayColor: string;
  onToggleCheck: (spotId: string) => void;
  onTimeEdit: (spotId: string, time: string) => void;
  onDelete?: (spotId: string) => void;
  onReorder?: (fromIdx: number, toIdx: number) => void;
}

export default function Timeline({ spots, dayColor, onToggleCheck, onTimeEdit, onDelete, onReorder }: TimelineProps) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  if (spots.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400 text-sm">No spots assigned to this day yet.</p>
        <p className="text-gray-300 text-xs mt-1">Go to Calendar to assign groups.</p>
      </div>
    );
  }

  return (
    <div className="pl-8">
      {spots.map((spot, i) => (
        <div
          key={spot.id}
          onDragOver={e => { e.preventDefault(); setOverIdx(i); }}
          onDragLeave={() => setOverIdx(null)}
          onDrop={() => {
            if (dragIdx !== null && dragIdx !== i) onReorder?.(dragIdx, i);
            setDragIdx(null);
            setOverIdx(null);
          }}
          className={`transition-all duration-150 ${
            overIdx === i && dragIdx !== i
              ? 'opacity-40 scale-[0.97]'
              : dragIdx === i
              ? 'opacity-60'
              : ''
          }`}
        >
          <SpotCard
            spot={spot}
            index={i}
            dayColor={dayColor}
            onToggleCheck={onToggleCheck}
            onTimeEdit={onTimeEdit}
            onDelete={onDelete}
            draggable={!!onReorder}
            onDragStart={() => setDragIdx(i)}
            onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}
          />
        </div>
      ))}
    </div>
  );
}
