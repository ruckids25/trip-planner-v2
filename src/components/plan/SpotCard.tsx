'use client';

import { Spot, SPOT_TYPE_CONFIG } from '@/types';
import { Check, Clock, MapPin, ExternalLink, GripVertical, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface SpotCardProps {
  spot: Spot;
  index: number;
  dayColor: string;
  onToggleCheck: (spotId: string) => void;
  onTimeEdit: (spotId: string, time: string) => void;
  onDelete?: (spotId: string) => void;
  draggable?: boolean;
  onDragStart?: () => void;
}

export default function SpotCard({
  spot, index, dayColor, onToggleCheck, onTimeEdit, onDelete,
  draggable, onDragStart,
}: SpotCardProps) {
  const [editingTime, setEditingTime] = useState(false);
  const [time, setTime] = useState(spot.timeOverride || '');
  const tc = SPOT_TYPE_CONFIG[spot.type] || SPOT_TYPE_CONFIG.other;

  const handleTimeSubmit = () => {
    onTimeEdit(spot.id, time);
    setEditingTime(false);
  };

  return (
    <div
      className={`flex gap-3 group ${draggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
      draggable={draggable}
      onDragStart={onDragStart}
    >
      {/* Timeline dot + line */}
      <div className="flex flex-col items-center flex-shrink-0 pt-1">
        {draggable && <GripVertical size={12} className="text-gray-300 mb-1 opacity-0 group-hover:opacity-100" />}
        <div className="relative">
          <div
            className="w-5 h-5 rounded-full border-2 flex items-center justify-center cursor-pointer"
            style={{ borderColor: dayColor, background: spot.checked ? dayColor : 'white' }}
            onClick={() => onToggleCheck(spot.id)}
          >
            {spot.checked && <Check size={10} className="text-white" />}
          </div>
          <span className="absolute -left-6 top-0.5 text-xs text-gray-400 font-mono w-5 text-right">
            {index + 1}
          </span>
        </div>
        <div className="w-0.5 flex-1 mt-1" style={{ background: `${dayColor}30` }} />
      </div>

      {/* Card */}
      <div className={`flex-1 bg-white rounded-xl border p-3 mb-3 transition-all hover:shadow-sm ${
        spot.checked ? 'border-gray-100 opacity-60' : 'border-gray-200'
      }`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span
              className="px-2 py-0.5 rounded-md text-xs font-medium text-white flex-shrink-0"
              style={{ background: tc.color }}
            >
              {tc.emoji} {tc.label}
            </span>
            <h4 className={`text-sm font-medium truncate ${spot.checked ? 'line-through text-gray-400' : 'text-gray-900'}`}>
              {spot.name}
            </h4>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${spot.lat},${spot.lng}`}
              target="_blank"
              rel="noopener"
              className="p-1 hover:bg-blue-50 rounded text-gray-300 hover:text-blue-500 transition-colors"
              onClick={e => e.stopPropagation()}
            >
              <ExternalLink size={14} />
            </a>
            {onDelete && spot.source === 'manual' && (
              <button
                onClick={() => onDelete(spot.id)}
                className="p-1 hover:bg-red-50 rounded text-gray-300 hover:text-red-500 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Time */}
        <div className="flex items-center gap-2 mt-2">
          {editingTime ? (
            <div className="flex items-center gap-1">
              <input
                value={time}
                onChange={e => setTime(e.target.value)}
                placeholder="10:00"
                className="w-20 px-2 py-1 border border-gray-200 rounded text-xs outline-none focus:ring-1 focus:ring-blue-400"
                onKeyDown={e => e.key === 'Enter' && handleTimeSubmit()}
                autoFocus
              />
              <button onClick={handleTimeSubmit} className="text-blue-500 text-xs font-medium">OK</button>
              <button onClick={() => setEditingTime(false)} className="text-gray-400 text-xs">Cancel</button>
            </div>
          ) : (
            <button
              onClick={() => setEditingTime(true)}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-500 transition-colors"
            >
              <Clock size={12} />
              {spot.timeOverride || spot.hours?.split('|')[0]?.trim() || 'Set time'}
            </button>
          )}

          {spot.rating && (
            <span className="text-xs text-yellow-600 ml-auto">★ {spot.rating}</span>
          )}
        </div>

        {spot.note && (
          <p className="text-xs text-gray-500 mt-1.5 bg-gray-50 px-2 py-1 rounded">{spot.note}</p>
        )}
      </div>
    </div>
  );
}
