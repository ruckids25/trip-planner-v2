'use client';

import { Spot, SPOT_TYPE_CONFIG } from '@/types';
import { Check, Clock, ExternalLink, GripVertical, Trash2, Pencil, X } from 'lucide-react';
import { useState } from 'react';

interface SpotCardProps {
  spot: Spot;
  index: number;
  dayColor: string;
  onToggleCheck: (spotId: string) => void;
  onTimeEdit: (spotId: string, time: string) => void;
  onNoteEdit?: (spotId: string, note: string) => void;
  onDelete?: (spotId: string) => void;
  draggable?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

const NOTE_MAX = 140;

export default function SpotCard({
  spot, index, dayColor, onToggleCheck, onTimeEdit, onNoteEdit, onDelete,
  draggable, onDragStart, onDragEnd,
}: SpotCardProps) {
  const [editingTime, setEditingTime] = useState(false);
  const [time, setTime] = useState(spot.timeOverride || '');
  const [editingNote, setEditingNote] = useState(false);
  const [note, setNote] = useState(spot.note || '');
  const tc = SPOT_TYPE_CONFIG[spot.type] || SPOT_TYPE_CONFIG.other;

  const handleTimeSubmit = () => {
    onTimeEdit(spot.id, time);
    setEditingTime(false);
  };

  const handleNoteSave = () => {
    onNoteEdit?.(spot.id, note);
    setEditingNote(false);
  };

  const displayTime = spot.timeOverride || spot.hours?.split('|')[0]?.trim() || '';

  return (
    <div
      className="timeline-item group"
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      {/* Left: grip + dot */}
      <div className="flex flex-col items-center flex-shrink-0 pt-0.5 relative">
        {draggable && (
          <GripVertical size={13}
            className="text-[var(--text-muted)] mb-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab"
            style={{ cursor: 'grab' }}
          />
        )}
        <div
          className={`tl-dot ${spot.checked ? 'checked' : ''}`}
          style={spot.checked ? {} : { borderColor: dayColor, color: dayColor }}
          onClick={() => onToggleCheck(spot.id)}
        >
          {spot.checked ? <Check size={11} className="text-white"/> : index + 1}
        </div>
      </div>

      {/* Right: card */}
      <div
        className={`tl-card ${spot.checked ? 'opacity-60' : ''}`}
        style={spot.checked ? { borderColor: 'var(--border)' } : {}}
      >
        {/* Top row: type chip + name + actions */}
        <div className="flex items-start gap-2">
          <span className="type-chip flex-shrink-0 mt-0.5"
            style={{ background: `${tc.color}18`, color: tc.color }}>
            {tc.emoji} {tc.label}
          </span>
          <h4 className={`flex-1 text-sm font-semibold leading-snug min-w-0 ${spot.checked ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}`}>
            {spot.name}
          </h4>
          <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <a href={`https://www.google.com/maps/search/?api=1&query=${spot.lat},${spot.lng}`}
              target="_blank" rel="noopener"
              className="p-1.5 hover:bg-[var(--accent-light)] rounded-lg text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
              onClick={e => e.stopPropagation()}>
              <ExternalLink size={13}/>
            </a>
            {onDelete && (
              <button onClick={() => onDelete(spot.id)}
                className="p-1.5 hover:bg-[var(--red-light)] rounded-lg text-[var(--text-muted)] hover:text-[var(--red)] transition-colors">
                <Trash2 size={13}/>
              </button>
            )}
          </div>
        </div>

        {/* Time + rating row */}
        <div className="flex items-center gap-3 mt-2">
          {editingTime ? (
            <div className="flex items-center gap-1.5">
              <input value={time} onChange={e => setTime(e.target.value)}
                placeholder="10:00"
                className="w-20 px-2 py-1 border border-[var(--border)] rounded-lg text-xs outline-none focus:border-[var(--accent)] transition-colors"
                onKeyDown={e => e.key === 'Enter' && handleTimeSubmit()} autoFocus/>
              <button onClick={handleTimeSubmit}
                className="text-xs font-semibold px-2 py-1 rounded-lg text-white"
                style={{ background: 'var(--accent)' }}>บันทึก</button>
              <button onClick={() => { setEditingTime(false); setTime(spot.timeOverride || ''); }}
                className="p-1 hover:bg-[var(--bg)] rounded-lg text-[var(--text-muted)]">
                <X size={12}/>
              </button>
            </div>
          ) : (
            <button onClick={() => setEditingTime(true)}
              className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors">
              <Clock size={12}/>
              <span>{displayTime || 'ตั้งเวลา'}</span>
            </button>
          )}
          {spot.rating && (
            <span className="text-xs font-semibold ml-auto"
              style={{ color: 'var(--amber)' }}>
              ★ {spot.rating}
            </span>
          )}
        </div>

        {/* Note section */}
        {editingNote ? (
          <div className="mt-2.5 bg-[var(--bg)] rounded-xl p-3">
            <textarea
              autoFocus
              value={note}
              onChange={e => setNote(e.target.value.slice(0, NOTE_MAX))}
              placeholder="เพิ่มโน้ต..."
              rows={3}
              className="w-full text-xs text-[var(--text-primary)] bg-transparent outline-none resize-none placeholder:text-[var(--text-muted)]"
              style={{ fontFamily: 'var(--font-body)' }}
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-[10px] text-[var(--text-muted)]">{note.length}/{NOTE_MAX}</span>
              <div className="flex gap-2">
                <button onClick={() => { setEditingNote(false); setNote(spot.note || ''); }}
                  className="text-xs text-[var(--text-muted)] px-2 py-1 rounded-lg hover:bg-white transition-colors">
                  ยกเลิก
                </button>
                <button onClick={handleNoteSave}
                  className="text-xs font-semibold text-white px-3 py-1 rounded-lg"
                  style={{ background: 'var(--accent)' }}>
                  บันทึก
                </button>
              </div>
            </div>
          </div>
        ) : spot.note ? (
          <div className="mt-2 flex items-start gap-2 group/note">
            <p className="flex-1 text-xs text-[var(--text-secondary)] bg-[var(--bg)] px-3 py-2 rounded-xl leading-relaxed">
              {spot.note}
            </p>
            {onNoteEdit && (
              <button onClick={() => setEditingNote(true)}
                className="opacity-0 group-hover/note:opacity-100 p-1.5 hover:bg-[var(--bg)] rounded-lg text-[var(--text-muted)] transition-all flex-shrink-0">
                <Pencil size={11}/>
              </button>
            )}
          </div>
        ) : onNoteEdit ? (
          <button onClick={() => setEditingNote(true)}
            className="mt-2 w-full text-left text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors opacity-0 group-hover:opacity-100 flex items-center gap-1">
            <Pencil size={11}/> เพิ่มโน้ต
          </button>
        ) : null}
      </div>
    </div>
  );
}
