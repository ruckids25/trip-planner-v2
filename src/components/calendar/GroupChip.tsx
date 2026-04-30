'use client';

import { Group } from '@/types';
import { GripVertical } from 'lucide-react';

interface GroupChipProps {
  group: Group;
  spotCount: number;
  assigned: boolean;
}

export default function GroupChip({ group, spotCount, assigned }: GroupChipProps) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('groupId', group.id);
      }}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl cursor-grab active:cursor-grabbing transition-all ${
        assigned
          ? 'bg-gray-100 text-gray-400 opacity-50'
          : 'bg-white border border-gray-200 hover:shadow-md hover:border-gray-300'
      }`}
    >
      <GripVertical size={14} className="text-gray-300" />
      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: group.color }} />
      <span className="text-sm font-medium text-gray-800 flex-1">{group.label}</span>
      <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">{spotCount}</span>
    </div>
  );
}
