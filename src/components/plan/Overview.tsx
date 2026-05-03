'use client';

import { useMemo } from 'react';
import { Trip, Spot, Group, DayMeta, SPOT_TYPE_CONFIG, GROUP_COLORS } from '@/types';
import CollabAvatars from '@/components/ui/CollabAvatars';
import { IconShare, IconExport, IconHotel } from '@/components/ui/Icons';

interface Props {
  trip: Trip;
  spots: Spot[];
  groups: Group[];
  dayMetas: DayMeta[];
  onDaySelect: (dayIdx: number) => void;
  onShare?: () => void;
  onExport?: () => void;
  collaboratorProfiles?: { id: string; name: string; color: string; photoURL?: string }[];
}

const DOW_TH = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

function guessArea(daySpots: Spot[]): string {
  if (daySpots.length === 0) return '';
  const areas = daySpots
    .map((s) => s.address || '').filter(Boolean)
    .map((addr) => {
      const parts = addr.split(',').map((p) => p.trim());
      return parts.length >= 3 ? parts[parts.length - 3] : parts.length >= 2 ? parts[parts.length - 2] : parts[0];
    })
    .filter(Boolean);
  const freq: Record<string, number> = {};
  areas.forEach((a) => { freq[a] = (freq[a] || 0) + 1; });
  const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) return '';
  if (sorted.length === 1) return sorted[0][0];
  return `${sorted[0][0]}, ${sorted[1][0]}`;
}

export default function Overview({
  trip,
  spots,
  groups,
  dayMetas,
  onDaySelect,
  onShare,
  onExport,
  collaboratorProfiles,
}: Props) {
  const totalDays = useMemo(() => {
    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);
    return Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1;
  }, [trip]);

  const stats = useMemo(() => {
    const checked = spots.filter((s) => s.checked).length;
    return {
      days: totalDays,
      spots: spots.length,
      visited: checked,
      remaining: spots.length - checked,
    };
  }, [spots, totalDays]);

  const days = useMemo(() => {
    const startDate = new Date(trip.startDate);
    return Array.from({ length: totalDays }, (_, i) => {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dayGroups = groups.filter((g) => g.assignedDay === i);
      const daySpotIds = dayGroups.flatMap((g) => g.spotIds);
      const daySpots = spots
        .filter((s) => daySpotIds.includes(s.id))
        .sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999));
      const meta = dayMetas.find((m) => m.dayIdx === i);
      return {
        dayIdx: i,
        date,
        dow: DOW_TH[date.getDay()],
        area: meta?.area || guessArea(daySpots),
        description: meta?.description || '',
        spots: daySpots,
        checked: daySpots.filter((s) => s.checked).length,
        hotel: meta?.hotelName ? { name: meta.hotelName } : null,
      };
    });
  }, [trip, totalDays, groups, spots, dayMetas]);

  const tripEmoji = (trip as Trip & { emoji?: string }).emoji ?? '🗺️';
  const collaborators = collaboratorProfiles ?? trip.collaborators.map((uid, i) => ({
    id: uid,
    name: uid.slice(0, 1).toUpperCase(),
    color: GROUP_COLORS[i % GROUP_COLORS.length],
  }));

  return (
    <div className="app-page" style={{ paddingBottom: 'calc(var(--nav-h) + 16px)' }}>
      {/* ── Header ───────────────────────────────────────── */}
      <div style={{ padding: '20px 20px 16px', background: 'white', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ minWidth: 0 }}>
            <p
              style={{
                fontSize: 11,
                color: 'var(--text-muted)',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: 1,
                marginBottom: 4,
              }}
            >
              ภาพรวมทริป
            </p>
            <h1 style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-head)', lineHeight: 1.2 }}>
              {trip.title}
            </h1>
            <p
              style={{
                fontSize: 13,
                color: 'var(--text-secondary)',
                marginTop: 3,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <span style={{ fontSize: 16 }}>{tripEmoji}</span>
              {trip.country} · {totalDays} วัน
            </p>
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button onClick={onShare} style={iconBtnStyle} aria-label="Share trip">
              <IconShare width={15} height={15} />
            </button>
            <button onClick={onExport} style={iconBtnStyle} aria-label="Export trip">
              <IconExport width={15} height={15} />
            </button>
          </div>
        </div>

        {/* Collaborators row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0 2px' }}>
          <CollabAvatars users={collaborators} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                fontSize: 12,
                color: 'var(--text-secondary)',
                fontWeight: 500,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {collaborators.length === 1
                ? `${collaborators[0].name} กำลังจัดแผนคนเดียว`
                : `${collaborators.slice(0, 3).map((c) => c.name).join(', ')} ร่วมแผนการเดินทาง`}
            </p>
          </div>
          <button
            onClick={onShare}
            style={{
              fontSize: 11,
              color: 'var(--accent)',
              fontWeight: 600,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
            }}
          >
            + เพิ่มคน
          </button>
        </div>
      </div>

      {/* ── Stats grid (4 cols) ─────────────────────────── */}
      <div style={{ padding: '14px 16px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {[
          { label: 'วัน', value: stats.days, icon: '📅' },
          { label: 'จุด', value: stats.spots, icon: '📍' },
          { label: 'เยี่ยมแล้ว', value: stats.visited, icon: '✅' },
          { label: 'เหลือ', value: stats.remaining, icon: '⏳' },
        ].map((s) => (
          <div key={s.label} style={statCardStyle}>
            <div style={{ fontSize: 18, marginBottom: 4 }}>{s.icon}</div>
            <div style={{ fontSize: 17, fontWeight: 700, fontFamily: 'var(--font-head)' }}>{s.value}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Day cards ───────────────────────────────────── */}
      <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p className="section-label">แผนทีละวัน</p>
        {days.map((day, i) => {
          const color = GROUP_COLORS[i % GROUP_COLORS.length];
          const pct = day.spots.length ? day.checked / day.spots.length : 0;
          return (
            <div
              key={day.dayIdx}
              className="card"
              style={{ cursor: 'pointer', overflow: 'hidden' }}
              onClick={() => onDaySelect(day.dayIdx)}
            >
              {/* color bar top */}
              <div style={{ height: 4, background: `linear-gradient(90deg, ${color}, ${color}80)` }} />
              <div style={{ padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10, gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <span
                        style={{
                          background: color,
                          color: 'white',
                          borderRadius: 8,
                          padding: '2px 10px',
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        วันที่ {day.dayIdx + 1}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{day.dow}</span>
                    </div>
                    <p
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {day.area || `${day.spots.length} สถานที่`}
                    </p>
                  </div>
                </div>

                {/* Progress */}
                <div style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      เยี่ยม {day.checked}/{day.spots.length} จุด
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: pct > 0 ? color : 'var(--text-muted)',
                      }}
                    >
                      {Math.round(pct * 100)}%
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${pct * 100}%`, background: color }}
                    />
                  </div>
                </div>

                {/* Spot chips */}
                {day.spots.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                    {day.spots.slice(0, 4).map((s) => {
                      const tc = SPOT_TYPE_CONFIG[s.type] || SPOT_TYPE_CONFIG.other;
                      return (
                        <span
                          key={s.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 3,
                            padding: '3px 8px',
                            borderRadius: 99,
                            background: s.checked ? '#D1FAE5' : '#F3F4F6',
                            color: s.checked ? '#065F46' : 'var(--text-secondary)',
                            fontSize: 11,
                            fontWeight: 500,
                          }}
                        >
                          {tc.emoji} {s.name.length > 14 ? s.name.slice(0, 14) + '…' : s.name}
                          {s.checked && <span style={{ color: 'var(--green)' }}>✓</span>}
                        </span>
                      );
                    })}
                    {day.spots.length > 4 && (
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: 99,
                          background: '#F3F4F6',
                          fontSize: 11,
                          color: 'var(--text-muted)',
                        }}
                      >
                        +{day.spots.length - 4} อื่นๆ
                      </span>
                    )}
                  </div>
                )}

                {/* Hotel + date row */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: 8,
                    borderTop: '1px solid var(--border)',
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                    <span style={{ color: 'var(--text-muted)', display: 'flex', flexShrink: 0 }}>
                      <IconHotel width={14} height={14} />
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        color: 'var(--text-secondary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {day.hotel?.name || 'ยังไม่มีโรงแรม'}
                    </span>
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>
                    {day.date.getDate()}/{day.date.getMonth() + 1}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const iconBtnStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'white',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  color: 'var(--text-secondary)',
  flexShrink: 0,
};

const statCardStyle: React.CSSProperties = {
  background: 'white',
  borderRadius: 12,
  border: '1px solid var(--border)',
  padding: '10px 8px',
  textAlign: 'center',
};
