'use client';

import { useState } from 'react';
import { Spot, SpotType, SPOT_TYPE_CONFIG } from '@/types';
import { Check, X } from 'lucide-react';

interface SpotEditorProps {
  spot: Omit<Spot, 'id' | 'createdAt'>;
  onSave: (data: Partial<Spot>) => void;
  onCancel: () => void;
}

const SPOT_TYPES = Object.entries(SPOT_TYPE_CONFIG) as [SpotType, typeof SPOT_TYPE_CONFIG[SpotType]][];

export default function SpotEditor({ spot, onSave, onCancel }: SpotEditorProps) {
  const [name, setName] = useState(spot.name);
  const [type, setType] = useState<SpotType>(spot.type);
  const [note, setNote] = useState(spot.note || '');

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
        <div className="flex flex-wrap gap-1.5">
          {SPOT_TYPES.map(([key, config]) => (
            <button
              key={key}
              onClick={() => setType(key)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                type === key
                  ? 'text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              style={type === key ? { background: config.color } : undefined}
            >
              {config.emoji} {config.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Note</label>
        <input
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Optional note..."
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        />
      </div>
      <div className="flex items-center gap-2 justify-end">
        <button onClick={onCancel} className="px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
          <X size={14} className="inline mr-1" /> Cancel
        </button>
        <button
          onClick={() => onSave({ name, type, note })}
          className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          <Check size={14} className="inline mr-1" /> Save
        </button>
      </div>
    </div>
  );
}
