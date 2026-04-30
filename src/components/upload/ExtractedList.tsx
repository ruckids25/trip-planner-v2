'use client';

import { Spot, SPOT_TYPE_CONFIG, SpotType } from '@/types';
import SpotEditor from './SpotEditor';
import { MapPin, Trash2, Edit3 } from 'lucide-react';
import { useState } from 'react';

interface ExtractedListProps {
  spots: Omit<Spot, 'id' | 'createdAt'>[];
  onUpdate: (index: number, data: Partial<Spot>) => void;
  onRemove: (index: number) => void;
  onSave: () => void;
  saving?: boolean;
}

export default function ExtractedList({ spots, onUpdate, onRemove, onSave, saving }: ExtractedListProps) {
  const [editIdx, setEditIdx] = useState<number | null>(null);

  if (spots.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Extracted Places <span className="text-gray-400 text-sm font-normal">({spots.length})</span>
        </h3>
        <button
          onClick={onSave}
          disabled={saving || spots.length === 0}
          className="px-5 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors font-medium text-sm disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save All to Trip'}
        </button>
      </div>

      <div className="space-y-2">
        {spots.map((spot, i) => {
          const typeConfig = SPOT_TYPE_CONFIG[spot.type] || SPOT_TYPE_CONFIG.other;

          return (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-sm transition-shadow">
              {editIdx === i ? (
                <SpotEditor
                  spot={spot}
                  onSave={(data) => { onUpdate(i, data); setEditIdx(null); }}
                  onCancel={() => setEditIdx(null)}
                />
              ) : (
                <div className="flex items-start gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                    style={{ background: typeConfig.color + '20', color: typeConfig.color }}
                  >
                    {typeConfig.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{spot.name}</p>
                    {spot.nameLocal && (
                      <p className="text-xs text-gray-500">{spot.nameLocal}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                      <MapPin size={12} /> {spot.address || `${spot.lat.toFixed(4)}, ${spot.lng.toFixed(4)}`}
                    </div>
                    {spot.rating && (
                      <span className="text-xs text-yellow-600 mt-1 inline-block">
                        {'★'.repeat(Math.round(spot.rating))} {spot.rating}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditIdx(i)}
                      className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-blue-500 transition-colors"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => onRemove(i)}
                      className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
