'use client';

import { useState } from 'react';
import { Spot, SPOT_TYPE_CONFIG } from '@/types';
import {
  IconCheck, IconClock, IconExternalLink, IconGrip, IconStar, IconTrash,
} from '@/components/ui/Icons';

interface DragHandleProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  attributes: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  listeners: any;
}

interface Props {
  spot: Spot;
  index: number;
  dayColor: string;
  selected?: boolean;
  onSelect?: () => void;
  onToggleCheck: (spotId: string) => void;
  onTimeEdit: (spotId: string, time: string) => void;
  onNoteEdit?: (spotId: string, note: string) => void;
  onDelete?: (spotId: string) => void;
  /** when true, the IconGrip is shown and accepts dragHandleProps */
  draggable?: boolean;
  /** dnd-kit listeners + attributes — applied ONLY to the grip handle */
  dragHandleProps?: DragHandleProps;
}

const MAX_NOTE = 140;

export default function SpotCard({
  spot, index, dayColor, selected, onSelect,
  onToggleCheck, onTimeEdit, onNoteEdit, onDelete,
  draggable, dragHandleProps,
}: Props) {
  const tc = SPOT_TYPE_CONFIG[spot.type] || SPOT_TYPE_CONFIG.other;

  const [editingTime, setEditingTime] = useState(false);
  const [timeVal, setTimeVal] = useState(spot.timeOverride || '');
  const [editingNote, setEditingNote] = useState(false);
  const [noteVal, setNoteVal] = useState(spot.note || '');

  const handleTimeSave = () => {
    onTimeEdit(spot.id, timeVal);
    setEditingTime(false);
  };

  const handleNoteSave = () => {
    onNoteEdit?.(spot.id, noteVal);
    setEditingNote(false);
  };

  const stop = (e: React.MouseEvent | React.SyntheticEvent) => e.stopPropagation();

  return (
    <div className="timeline-item" {...(dragHandleProps?.attributes ?? {})}>

      {/* tl-dot — clickable check */}
      <div
        className={`tl-dot ${spot.checked ? 'checked' : ''}`}
        style={{ borderColor: spot.checked ? 'var(--green)' : dayColor }}
        onClick={(e) => { stop(e); onToggleCheck(spot.id); }}
      >
        {spot.checked ? <IconCheck width={14} height={14} /> : <span style={{ fontSize: 10 }}>{index + 1}</span>}
      </div>

      {/* tl-card */}
      <div
        className={`tl-card ${selected ? 'selected' : ''}`}
        onClick={onSelect}
        style={{ cursor: 'default' }}
      >
        {/* Top row: emoji + chip + name + actions */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 14 }}>{tc.emoji}</span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: 99,
                  background: `${tc.color}18`,
                  color: tc.color,
                }}
              >
                {tc.label}
              </span>
              {spot.rating && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    color: '#D97706',
                    fontSize: 11,
                    fontWeight: 600,
                    marginLeft: 'auto',
                  }}
                >
                  <IconStar width={12} height={12} /> {spot.rating}
                </div>
              )}
            </div>
            <p
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: spot.checked ? 'var(--text-muted)' : 'var(--text-primary)',
                textDecoration: spot.checked ? 'line-through' : 'none',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {spot.name}
            </p>
          </div>

          {/* Action buttons */}
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}
            onClick={stop}
          >
            {draggable && (
              <button
                {...(dragHandleProps?.listeners ?? {})}
                aria-label="ลากเพื่อจัดลำดับใหม่"
                style={{
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 6,
                  cursor: 'grab',
                  touchAction: 'none', // critical: tells the browser to NOT scroll while we're dragging
                  background: 'none',
                  border: 'none',
                  borderRadius: 6,
                  opacity: 0.55,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <IconGrip width={14} height={14} />
              </button>
            )}
            <a
              href={`https://maps.google.com/?q=${spot.lat},${spot.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: 'var(--text-muted)',
                display: 'flex',
                padding: 4,
                borderRadius: 6,
                textDecoration: 'none',
              }}
            >
              <IconExternalLink width={14} height={14} />
            </a>
            {onDelete && (
              <button
                onClick={() => onDelete(spot.id)}
                style={{
                  color: '#F87171',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  padding: 4,
                  borderRadius: 6,
                }}
                aria-label="Delete spot"
              >
                <IconTrash width={14} height={14} />
              </button>
            )}
          </div>
        </div>

        {/* Time + Note row */}
        <div
          style={{
            marginTop: 8,
            paddingTop: 8,
            borderTop: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
          onClick={stop}
        >
          {/* Time edit */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ color: 'var(--text-muted)', display: 'flex', flexShrink: 0 }}>
              <IconClock width={13} height={13} />
            </div>
            {editingTime ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                <input
                  type="time"
                  value={timeVal}
                  onChange={(e) => setTimeVal(e.target.value)}
                  autoFocus
                  style={{
                    flex: 1,
                    border: '1.5px solid var(--accent)',
                    borderRadius: 7,
                    padding: '4px 8px',
                    fontSize: 13,
                    fontFamily: 'var(--font-body)',
                    outline: 'none',
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleTimeSave()}
                />
                <button
                  onClick={handleTimeSave}
                  style={smallPrimaryBtn}
                >
                  บันทึก
                </button>
                <button
                  onClick={() => setEditingTime(false)}
                  style={smallGhostBtn}
                >
                  ยกเลิก
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setTimeVal(spot.timeOverride || ''); setEditingTime(true); }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: spot.timeOverride ? 600 : 400,
                    color: spot.timeOverride ? 'var(--text-secondary)' : 'var(--text-muted)',
                  }}
                >
                  {spot.timeOverride || 'ตั้งเวลา...'}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', opacity: 0.6 }}>(แก้ไข)</span>
              </button>
            )}
          </div>

          {/* Note */}
          {editingNote ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <textarea
                autoFocus
                value={noteVal}
                maxLength={MAX_NOTE}
                onChange={(e) => setNoteVal(e.target.value)}
                placeholder="เพิ่มรายละเอียด..."
                rows={3}
                style={{
                  width: '100%',
                  border: '1.5px solid var(--accent)',
                  borderRadius: 8,
                  padding: '8px 10px',
                  fontSize: 13,
                  fontFamily: 'var(--font-body)',
                  outline: 'none',
                  resize: 'none',
                  color: 'var(--text-primary)',
                  background: 'var(--bg)',
                }}
              />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span
                  style={{
                    fontSize: 11,
                    color: noteVal.length >= MAX_NOTE ? 'var(--red)' : 'var(--text-muted)',
                  }}
                >
                  {noteVal.length}/{MAX_NOTE}
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => setEditingNote(false)} style={smallGhostBtn}>ยกเลิก</button>
                  <button onClick={handleNoteSave} style={smallPrimaryBtn}>บันทึก</button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => { setNoteVal(spot.note || ''); setEditingNote(true); }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                textAlign: 'left',
                width: '100%',
              }}
            >
              {spot.note ? (
                <p
                  style={{
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    background: '#FFFBEB',
                    borderRadius: 6,
                    padding: '5px 8px',
                    border: '1px solid #FDE68A',
                    lineHeight: 1.5,
                  }}
                >
                  📝 {spot.note}
                </p>
              ) : (
                <p style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  + เพิ่มรายละเอียด...
                </p>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const smallPrimaryBtn: React.CSSProperties = {
  background: 'var(--accent)',
  color: 'white',
  border: 'none',
  borderRadius: 7,
  padding: '4px 12px',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'var(--font-body)',
};

const smallGhostBtn: React.CSSProperties = {
  background: 'none',
  border: '1px solid var(--border)',
  borderRadius: 7,
  padding: '4px 10px',
  fontSize: 12,
  cursor: 'pointer',
  color: 'var(--text-muted)',
  fontFamily: 'var(--font-body)',
};
