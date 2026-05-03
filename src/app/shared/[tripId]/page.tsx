'use client';

import { useState, useCallback, useMemo, useEffect, use } from 'react';
import { Trip, Spot, Group, DayMeta, SPOT_TYPE_CONFIG, GROUP_COLORS } from '@/types';
import { getTrip, getSpots, getGroups, getDayMetas, updateSpot } from '@/lib/firestore';
import {
  IconChevLeft, IconChevRight, IconClock, IconExternalLink, IconCopy, IconCheck, IconEdit,
} from '@/components/ui/Icons';

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

export default function SharedTripPage({
  params,
  searchParams,
}: {
  params: Promise<{ tripId: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const { tripId } = use(params);
  const { mode } = use(searchParams);
  const isEditMode = mode === 'edit';

  const [trip, setTrip] = useState<Trip | null>(null);
  const [spots, setSpots] = useState<Spot[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [dayMetas, setDayMetas] = useState<DayMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [permission, setPermission] = useState<'view' | 'edit'>(isEditMode ? 'edit' : 'view');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const t = await getTrip(tripId);
        if (!t) { setError('ไม่พบทริปนี้'); setLoading(false); return; }
        if (!t.isShared) { setError('ทริปนี้ไม่ได้ถูกแชร์'); setLoading(false); return; }
        setTrip(t);
        const [s, g, m] = await Promise.all([
          getSpots(tripId),
          getGroups(tripId),
          getDayMetas(tripId),
        ]);
        setSpots(s);
        setGroups(g);
        setDayMetas(m);
      } catch {
        setError('ไม่สามารถโหลดทริปนี้ได้');
      }
      setLoading(false);
    }
    load();
  }, [tripId]);

  const totalDays = useMemo(() => {
    if (!trip) return 0;
    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);
    return Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1;
  }, [trip]);

  const getDaySpots = useCallback((dayIdx: number) => {
    const dayGroups = groups.filter((g) => g.assignedDay === dayIdx);
    const daySpotIds = dayGroups.flatMap((g) => g.spotIds);
    return spots
      .filter((s) => daySpotIds.includes(s.id))
      .sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999));
  }, [groups, spots]);

  const handleToggleCheck = useCallback(async (spotId: string) => {
    if (!isEditMode) return;
    const spot = spots.find((s) => s.id === spotId);
    if (!spot) return;
    const newChecked = !spot.checked;
    setSpots((prev) => prev.map((s) => (s.id === spotId ? { ...s, checked: newChecked } : s)));
    try {
      await updateSpot(tripId, spotId, { checked: newChecked });
    } catch {
      setSpots((prev) => prev.map((s) => (s.id === spotId ? { ...s, checked: !newChecked } : s)));
    }
  }, [isEditMode, spots, tripId]);

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/shared/${tripId}${permission === 'edit' ? '?mode=edit' : ''}`
    : '';

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Some embedded browsers block clipboard; we silently no-op.
    }
  };

  // ── Loading / Error ────────────────────────────────
  if (loading) {
    return (
      <>
        <div className="app-page" style={{ alignItems: 'center', justifyContent: 'center', display: 'flex' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 28,
                height: 28,
                border: '3px solid var(--accent)',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin .7s linear infinite',
              }}
            />
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>กำลังโหลดทริป...</p>
          </div>
        </div>
      </>
    );
  }

  if (error || !trip) {
    return (
      <>
        <div className="app-page" style={{ alignItems: 'center', justifyContent: 'center', display: 'flex' }}>
          <div style={{ textAlign: 'center', maxWidth: 320, padding: 24 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔒</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>ไม่สามารถเข้าถึงทริปได้</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{error || 'ไม่พบทริปนี้'}</p>
          </div>
        </div>
      </>
    );
  }

  // ── Day detail view ───────────────────────────────
  if (selectedDay !== null) {
    const daySpots = getDaySpots(selectedDay);
    const color = GROUP_COLORS[selectedDay % GROUP_COLORS.length];
    const dayDate = new Date(trip.startDate);
    dayDate.setDate(dayDate.getDate() + selectedDay);
    const meta = dayMetas.find((m) => m.dayIdx === selectedDay);
    const area = meta?.area || guessArea(daySpots);

    return (
      <>
        <div className="app-page">
          <div
            style={{
              padding: '14px 16px',
              background: 'white',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <button
              onClick={() => setSelectedDay(null)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                display: 'flex',
              }}
            >
              <IconChevLeft />
            </button>
            <span
              style={{
                background: color,
                color: 'white',
                fontSize: 12,
                fontWeight: 700,
                padding: '2px 10px',
                borderRadius: 99,
              }}
            >
              วันที่ {selectedDay + 1}
            </span>
            <span style={{ fontWeight: 700, fontSize: 15, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {area}
            </span>
            {isEditMode && (
              <span
                style={{
                  marginLeft: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '3px 8px',
                  background: 'var(--amber-light)',
                  color: '#92400E',
                  borderRadius: 99,
                  fontSize: 11,
                  fontWeight: 700,
                  border: '1px solid #FDE68A',
                }}
              >
                <IconEdit width={11} height={11} /> แก้ไข
              </span>
            )}
          </div>

          <div style={{ padding: '14px 16px' }}>
            {daySpots.map((spot, i) => {
              const tc = SPOT_TYPE_CONFIG[spot.type] || SPOT_TYPE_CONFIG.other;
              return (
                <div
                  key={spot.id}
                  style={{
                    background: 'white',
                    borderRadius: 12,
                    border: '1px solid var(--border)',
                    padding: '12px 14px',
                    marginBottom: 10,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <button
                    onClick={() => handleToggleCheck(spot.id)}
                    disabled={!isEditMode}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 99,
                      background: spot.checked ? 'var(--green)' : color,
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 700,
                      flexShrink: 0,
                      border: 'none',
                      cursor: isEditMode ? 'pointer' : 'default',
                    }}
                  >
                    {spot.checked ? <IconCheck width={14} height={14} /> : i + 1}
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        textDecoration: spot.checked ? 'line-through' : 'none',
                        color: spot.checked ? 'var(--text-muted)' : 'var(--text-primary)',
                      }}
                    >
                      {tc.emoji} {spot.name}
                    </p>
                    {spot.timeOverride && (
                      <p
                        style={{
                          fontSize: 12,
                          color: 'var(--text-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          marginTop: 2,
                        }}
                      >
                        <IconClock width={10} height={10} /> {spot.timeOverride}
                      </p>
                    )}
                  </div>
                  <a
                    href={`https://maps.google.com/?q=${spot.lat},${spot.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--text-muted)', display: 'flex' }}
                  >
                    <IconExternalLink width={14} height={14} />
                  </a>
                </div>
              );
            })}
            {daySpots.length === 0 && (
              <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)' }}>
                <p style={{ fontSize: 14 }}>ยังไม่มีสถานที่สำหรับวันนี้</p>
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  // ── Share landing (default) ───────────────────────
  return (
    <>
      <div className="app-page">
        {/* Header */}
        <div style={{ padding: '20px 20px 16px', background: 'white', borderBottom: '1px solid var(--border)' }}>
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
            แชร์ทริป
          </p>
          <h1 style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-head)' }}>{trip.title}</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
            {trip.country} · {totalDays} วัน · {spots.length} สถานที่
          </p>
        </div>

        <div style={{ padding: 16 }}>
          {/* Permission toggle */}
          <div
            style={{
              background: 'var(--bg)',
              borderRadius: 12,
              padding: 4,
              display: 'flex',
              gap: 4,
              marginBottom: 16,
              border: '1px solid var(--border)',
            }}
          >
            {[{ id: 'view' as const, label: '👁 ดูอย่างเดียว' }, { id: 'edit' as const, label: '✏️ แก้ไขได้' }].map((p) => (
              <button
                key={p.id}
                onClick={() => setPermission(p.id)}
                style={{
                  flex: 1,
                  padding: 10,
                  borderRadius: 9,
                  border: 'none',
                  cursor: 'pointer',
                  background: permission === p.id ? 'white' : 'transparent',
                  color: permission === p.id ? 'var(--accent)' : 'var(--text-muted)',
                  fontWeight: permission === p.id ? 700 : 500,
                  fontSize: 14,
                  fontFamily: 'var(--font-body)',
                  boxShadow: permission === p.id ? 'var(--shadow-sm)' : 'none',
                  transition: 'all .15s',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Link copy */}
          <div className="card" style={{ padding: 14, marginBottom: 14 }}>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
              ลิงก์แชร์ ({permission === 'view' ? 'ดูอย่างเดียว' : 'แก้ไขได้'})
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <div
                style={{
                  flex: 1,
                  background: 'var(--bg)',
                  borderRadius: 8,
                  padding: '10px 12px',
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  border: '1px solid var(--border)',
                }}
              >
                {shareUrl}
              </div>
              <button
                onClick={handleCopy}
                style={{
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: 'none',
                  background: copied ? 'var(--green)' : 'var(--accent)',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 13,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'background .2s',
                  fontFamily: 'var(--font-body)',
                }}
              >
                {copied ? <><IconCheck width={14} height={14} />คัดลอกแล้ว!</> : <><IconCopy width={14} height={14} />คัดลอก</>}
              </button>
            </div>
          </div>

          {/* Share via */}
          <p className="section-label" style={{ marginBottom: 10 }}>แชร์ผ่าน</p>
          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            {[
              { label: 'LINE', bg: '#06C755', icon: '💬', href: `https://line.me/R/msg/text/?${encodeURIComponent(shareUrl)}` },
              { label: 'อีเมล', bg: '#EA4335', icon: '📧', href: `mailto:?subject=${encodeURIComponent(trip.title)}&body=${encodeURIComponent(shareUrl)}` },
              { label: 'IG', bg: '#E1306C', icon: '📸', href: shareUrl },
            ].map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  flex: 1,
                  padding: '10px 0',
                  borderRadius: 10,
                  border: 'none',
                  background: `${s.bg}18`,
                  color: s.bg,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  textDecoration: 'none',
                }}
              >
                <span style={{ fontSize: 20 }}>{s.icon}</span>
                {s.label}
              </a>
            ))}
          </div>

          {/* Day preview list */}
          <p className="section-label" style={{ marginBottom: 10 }}>วันในทริป</p>
          <div
            style={{
              border: '1.5px solid var(--border)',
              borderRadius: 14,
              overflow: 'hidden',
              background: 'white',
            }}
          >
            {Array.from({ length: totalDays }, (_, i) => {
              const dayGroups = groups.filter((g) => g.assignedDay === i);
              const daySpotIds = dayGroups.flatMap((g) => g.spotIds);
              const daySpots = spots.filter((s) => daySpotIds.includes(s.id));
              const meta = dayMetas.find((m) => m.dayIdx === i);
              const area = meta?.area || guessArea(daySpots) || `วันที่ ${i + 1}`;
              const date = new Date(trip.startDate);
              date.setDate(date.getDate() + i);
              const tc = daySpots[0] ? SPOT_TYPE_CONFIG[daySpots[0].type] : null;
              const color = GROUP_COLORS[i % GROUP_COLORS.length];
              return (
                <div
                  key={i}
                  onClick={() => setSelectedDay(i)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px',
                    borderBottom: i < totalDays - 1 ? '1px solid var(--border)' : 'none',
                    cursor: 'pointer',
                    background: 'white',
                  }}
                >
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      flexShrink: 0,
                      background: `${color}15`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 20,
                    }}
                  >
                    {tc?.emoji || '📍'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {area}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 1 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        วันที่ {i + 1} · {DOW_TH[date.getDay()]}
                      </span>
                      <div style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--border)' }} />
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{daySpots.length} จุด</span>
                    </div>
                  </div>
                  <div style={{ color: 'var(--text-muted)', display: 'flex' }}>
                    <IconChevRight />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
