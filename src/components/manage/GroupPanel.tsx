'use client';

import { Group, Spot, SPOT_TYPE_CONFIG } from '@/types';
import { ChevronDown, ChevronRight, GripVertical, MapPin, Edit3, Trash2, Plus } from 'lucide-react';
import { useState } from 'react';

interface GroupPanelProps {
  groups: Group[];
  spots: Spot[];
  onSpotMove: (spotId: string, fromGroupId: string, toGroupId: string) => void;
  onGroupEdit: (groupId: string, data: { label?: string; color?: string }) => void;
  onGroupDelete: (groupId: string) => void;
  onGroupCreate: () => void;
  selectedSpotId?: string;
  onSpotSelect?: (spotId: string) => void;
}

export default function GroupPanel({
  groups, spots, onSpotMove, onGroupEdit, onGroupDelete, onGroupCreate,
  selectedSpotId, onSpotSelect,
}: GroupPanelProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(groups.map(g => g.id)));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [dragSpotId, setDragSpotId] = useState<string | null>(null);
  const [dragOverGroup, setDragOverGroup] = useState<string | null>(null);

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const getGroupSpots = (group: Group) =>
    spots.filter(s => group.spotIds.includes(s.id));

  const ungroupedSpots = spots.filter(s => !groups.some(g => g.spotIds.includes(s.id)));

  const handleDragStart = (spotId: string) => setDragSpotId(spotId);

  const handleDrop = (targetGroupId: string) => {
    if (!dragSpotId) return;
    const fromGroup = groups.find(g => g.spotIds.includes(dragSpotId));
    if (fromGroup && fromGroup.id !== targetGroupId) {
      onSpotMove(dragSpotId, fromGroup.id, targetGroupId);
    }
    setDragSpotId(null);
    setDragOverGroup(null);
  };

  const startEdit = (group: Group) => {
    setEditingId(group.id);
    setEditLabel(group.label);
  };

  return (
    <div className="space-y-2 h-full overflow-y-auto scrollbar-thin pr-1">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Groups</h3>
        <button
          onClick={onGroupCreate}
          className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-blue-500 transition-colors"
        >
          <Plus size={16} />
        </button>
      </div>

      {groups.map(group => {
        const groupSpots = getGroupSpots(group);
        const isExpanded = expanded.has(group.id);
        const isOver = dragOverGroup === group.id;

        return (
          <div
            key={group.id}
            className={`rounded-xl border transition-all ${isOver ? 'border-blue-400 bg-blue-50' : 'border-gray-100 bg-white'}`}
            onDragOver={(e) => { e.preventDefault(); setDragOverGroup(group.id); }}
            onDragLeave={() => setDragOverGroup(null)}
            onDrop={() => handleDrop(group.id)}
          >
            <div className="flex items-center gap-2 p-3 cursor-pointer" onClick={() => toggle(group.id)}>
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: group.color }} />
              {editingId === group.id ? (
                <input
                  value={editLabel}
                  onChange={e => setEditLabel(e.target.value)}
                  onBlur={() => { onGroupEdit(group.id, { label: editLabel }); setEditingId(null); }}
                  onKeyDown={e => { if (e.key === 'Enter') { onGroupEdit(group.id, { label: editLabel }); setEditingId(null); } }}
                  onClick={e => e.stopPropagation()}
                  className="flex-1 text-sm font-medium bg-transparent border-b border-blue-400 outline-none py-0"
                  autoFocus
                />
              ) : (
                <span className="flex-1 text-sm font-medium text-gray-900">{group.label}</span>
              )}
              <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">{groupSpots.length}</span>
              <button onClick={(e) => { e.stopPropagation(); startEdit(group); }} className="p-1 hover:bg-gray-100 rounded text-gray-300 hover:text-blue-500">
                <Edit3 size={12} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); onGroupDelete(group.id); }} className="p-1 hover:bg-red-50 rounded text-gray-300 hover:text-red-500">
                <Trash2 size={12} />
              </button>
              {isExpanded ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
            </div>

            {isExpanded && (
              <div className="px-3 pb-3 space-y-1">
                {groupSpots.map(spot => {
                  const tc = SPOT_TYPE_CONFIG[spot.type] || SPOT_TYPE_CONFIG.other;
                  return (
                    <div
                      key={spot.id}
                      draggable
                      onDragStart={() => handleDragStart(spot.id)}
                      onClick={() => onSpotSelect?.(spot.id)}
                      className={`flex items-center gap-2 p-2 rounded-lg cursor-grab active:cursor-grabbing hover:bg-gray-50 transition-colors ${
                        selectedSpotId === spot.id ? 'bg-blue-50 ring-1 ring-blue-200' : ''
                      }`}
                    >
                      <GripVertical size={12} className="text-gray-300 flex-shrink-0" />
                      <span className="text-xs">{tc.emoji}</span>
                      <span className="text-xs text-gray-700 flex-1 truncate">{spot.name}</span>
                    </div>
                  );
                })}
                {groupSpots.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-2">Drop spots here</p>
                )}
              </div>
            )}
          </div>
        );
      })}

      {ungroupedSpots.length > 0 && (
        <div className="rounded-xl border border-dashed border-gray-200 p-3">
          <p className="text-xs font-medium text-gray-500 mb-2">Ungrouped ({ungroupedSpots.length})</p>
          {ungroupedSpots.map(spot => {
            const tc = SPOT_TYPE_CONFIG[spot.type] || SPOT_TYPE_CONFIG.other;
            return (
              <div
                key={spot.id}
                draggable
                onDragStart={() => handleDragStart(spot.id)}
                className="flex items-center gap-2 p-2 rounded-lg cursor-grab hover:bg-gray-50"
              >
                <GripVertical size={12} className="text-gray-300" />
                <span className="text-xs">{tc.emoji}</span>
                <span className="text-xs text-gray-700 truncate">{spot.name}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
