'use client';

import { useState, useCallback, useMemo, useEffect, use } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTrip } from '@/hooks/useTrip';
import { useSpots } from '@/hooks/useSpots';
import { useGroups } from '@/hooks/useGroups';
import { useDayMeta } from '@/hooks/useDayMeta';
import { useToast } from '@/components/ui/Toast';
import BottomNav from '@/components/ui/BottomNav';
import Overview from '@/components/plan/Overview';
import Timeline from '@/components/plan/Timeline';
import PlanMap from '@/components/plan/PlanMap';
import ShareModal from '@/components/plan/ShareModal';
import { optimizeRoute } from '@/lib/route-optimizer';
import { GROUP_COLORS, SpotType } from '@/types';
import {
  IconChevLeft, IconChevRight, IconGrid, IconSearch, IconLink, IconWand, IconX, IconHotel,
} from '@/components/ui/Icons';

const DOW_TH = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

function guessAreaFromSpots(daySpots: { address?: string }[]): string {
  if (daySpots.length === 0) return '';
  const areas = daySpots.map((s) => s.address || '').filter(Boolean).map((addr) => {
    const parts = addr.split(',').map((p) => p.trim());
    return parts.length >= 3 ? parts[parts.length - 3] : parts.length >= 2 ? parts[parts.length - 2] : parts[0];
  }).filter(Boolean);
  const freq: Record<string, number> = {};
  areas.forEach((a) => { freq[a] = (freq[a] || 0) + 1; });
  const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) return '';
  return sorted.length === 1 ? sorted[0][0] : `${sorted[0][0]}, ${sorted[1][0]}`;
}

interface HotelResult { name: string; lat: number; lng: number; address: string; }
interface PlaceResult { name: string; lat: number; lng: number; address: string; type: string; hours: string; rating: number | null; }

export default function PlanPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = use(params);
  const searchParams = useSearchParams();
  const router = useRouter();
  const { trip } = useTrip(tripId);
  const { spots, update: updateSpot, add: addSpot, remove: removeSpot } = useSpots(tripId);
  const { groups } = useGroups(tripId);
  const { dayMetas, getMeta, updateMeta } = useDayMeta(tripId);
  const { toast } = useToast();

  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [showShare, setShowShare] = useState(false);

  // Sync URL with day selection so BottomNav highlights "วันนี้" tab.
  // null → /trips/[id]/plan ; number → /trips/[id]/plan?day=N
  const selectDay = useCallback(
    (next: number | null) => {
      setSelectedDay(next);
      const path = `/trips/${tripId}/plan${next === null ? '' : `?day=${next}`}`;
      router.replace(path, { scroll: false });
    },
    [tripId, router],
  );

  const totalDays = useMemo(() => {
    if (!trip) return 0;
    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);
    return Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1;
  }, [trip]);

  // Read ?day query param: "today" or a number → jump straight to day view
  useEffect(() => {
    if (!trip) return;
    const day = searchParams?.get('day');
    if (!day) return;
    if (day === 'today') {
      const start = new Date(trip.startDate);
      start.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diff = Math.round((today.getTime() - start.getTime()) / 86400000);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot from ?day=today (Date.now() impure in render)
      setSelectedDay(Math.min(Math.max(diff, 0), totalDays - 1));
    } else {
      const n = parseInt(day, 10);
      if (!Number.isNaN(n) && n >= 0 && n < totalDays) {
        setSelectedDay(n);
      }
    }
  }, [trip, totalDays, searchParams]);

  const getDaySpots = useCallback((dayIdx: number) => {
    const dayGroups = groups.filter((g) => g.assignedDay === dayIdx);
    const daySpotIds = dayGroups.flatMap((g) => g.spotIds);
    return spots
      .filter((s) => daySpotIds.includes(s.id))
      .sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999));
  }, [groups, spots]);

  const dayColor = useCallback(
    (dayIdx: number) => GROUP_COLORS[dayIdx % GROUP_COLORS.length],
    [],
  );

  const handleToggleCheck = useCallback(async (spotId: string) => {
    const spot = spots.find((s) => s.id === spotId);
    if (spot) await updateSpot(spotId, { checked: !spot.checked });
  }, [spots, updateSpot]);

  const handleTimeEdit = useCallback(async (spotId: string, time: string) => {
    await updateSpot(spotId, { timeOverride: time });
    toast('อัปเดตเวลาแล้ว', 'success');
  }, [updateSpot, toast]);

  const handleNoteEdit = useCallback(async (spotId: string, note: string) => {
    await updateSpot(spotId, { note });
  }, [updateSpot]);

  const handleOptimize = useCallback(async () => {
    if (selectedDay === null) return;
    const daySpots = getDaySpots(selectedDay);
    const optimized = optimizeRoute(daySpots);
    for (let i = 0; i < optimized.length; i++) {
      await updateSpot(optimized[i].id, { sortOrder: i });
    }
    toast('จัดเส้นทางใหม่สำเร็จ ✨', 'success');
  }, [selectedDay, getDaySpots, updateSpot, toast]);

  const handleAddSpot = useCallback(async (result: PlaceResult) => {
    if (selectedDay === null) return;
    const dayGroups = groups.filter((g) => g.assignedDay === selectedDay);
    await addSpot({
      name: result.name,
      lat: result.lat,
      lng: result.lng,
      type: result.type as SpotType,
      address: result.address,
      hours: result.hours,
      rating: result.rating ?? undefined,
      source: 'search',
      groupId: dayGroups[0]?.id,
      dayIdx: selectedDay,
      sortOrder: getDaySpots(selectedDay).length,
    });
    toast(`เพิ่ม "${result.name}" แล้ว! ✅`, 'success');
  }, [selectedDay, groups, addSpot, getDaySpots, toast]);

  const handleReorder = useCallback(async (fromIdx: number, toIdx: number) => {
    if (selectedDay === null) return;
    const daySpots = getDaySpots(selectedDay);
    const reordered = [...daySpots];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    await Promise.all(
      reordered.map((s, i) => (s.sortOrder !== i ? updateSpot(s.id, { sortOrder: i }) : Promise.resolve())),
    );
  }, [selectedDay, getDaySpots, updateSpot]);

  const handleSetHotel = useCallback(async (hotel: HotelResult) => {
    if (selectedDay === null) return;
    await updateMeta(selectedDay, { hotelName: hotel.name, hotelLat: hotel.lat, hotelLng: hotel.lng });
    toast(`ตั้งโรงแรม "${hotel.name}" แล้ว`, 'success');
  }, [selectedDay, updateMeta, toast]);

  const handleClearHotel = useCallback(async () => {
    if (selectedDay === null) return;
    await updateMeta(selectedDay, { hotelName: '', hotelLat: 0, hotelLng: 0 });
  }, [selectedDay, updateMeta]);

  if (!trip) return null;

  // ── Overview mode ─────────────────────────────────
  if (selectedDay === null) {
    return (
      <>
        <Overview
          trip={trip}
          spots={spots}
          groups={groups}
          dayMetas={dayMetas}
          onDaySelect={selectDay}
          onShare={() => setShowShare(true)}
          onExport={() => toast('กำลัง Export...')}
        />
        <BottomNav />
        <ShareModal trip={trip} open={showShare} onClose={() => setShowShare(false)} />
      </>
    );
  }

  // ── Day mode ──────────────────────────────────────
  const daySpots = getDaySpots(selectedDay);
  const color = dayColor(selectedDay);
  const meta = getMeta(selectedDay);
  const hotel = meta?.hotelLat
    ? { name: meta.hotelName!, lat: meta.hotelLat, lng: meta.hotelLng! }
    : undefined;
  const dayDate = new Date(trip.startDate);
  dayDate.setDate(dayDate.getDate() + selectedDay);
  const area = meta?.area || guessAreaFromSpots(daySpots);

  return (
    <>

      <div className="app-page" style={{ overflow: 'hidden', padding: 0 }}>
        {/* ── Header (back + day nav + dots) ───────── */}
        <div
          style={{
            background: 'white',
            borderBottom: '1px solid var(--border)',
            padding: '12px 16px',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <button
              onClick={() => selectDay(null)}
              style={iconBtnInline}
              aria-label="กลับไปยังภาพรวม"
            >
              <IconGrid />
            </button>
            <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
            <button
              onClick={() => selectDay(Math.max(0, selectedDay - 1))}
              disabled={selectedDay === 0}
              style={{ ...iconBtnInline, color: selectedDay === 0 ? 'var(--border)' : 'var(--text-secondary)' }}
              aria-label="วันก่อนหน้า"
            >
              <IconChevLeft />
            </button>
            <div style={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
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
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  {DOW_TH[dayDate.getDay()]} · {dayDate.getDate()}/{dayDate.getMonth() + 1}
                </span>
              </div>
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  marginTop: 1,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {area || `${daySpots.length} สถานที่`}
              </p>
            </div>
            <button
              onClick={() => selectDay(Math.min(totalDays - 1, selectedDay + 1))}
              disabled={selectedDay >= totalDays - 1}
              style={{
                ...iconBtnInline,
                color: selectedDay >= totalDays - 1 ? 'var(--border)' : 'var(--text-secondary)',
              }}
              aria-label="วันถัดไป"
            >
              <IconChevRight />
            </button>
          </div>

          {/* Day-dot navigation */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 8 }}>
            {Array.from({ length: totalDays }, (_, i) => (
              <button
                key={i}
                onClick={() => selectDay(i)}
                style={{
                  width: i === selectedDay ? 20 : 7,
                  height: 7,
                  borderRadius: 99,
                  background: i === selectedDay ? color : 'var(--border)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all .2s',
                  padding: 0,
                }}
                aria-label={`ไปยังวันที่ ${i + 1}`}
              />
            ))}
          </div>
        </div>

        {/* ── Map (top) — fixed 200px frame; overflow:hidden keeps Leaflet contained ── */}
        <div
          style={{
            height: 200,
            minHeight: 200,
            maxHeight: 200,
            flexShrink: 0,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <PlanMap
            spots={daySpots}
            dayColor={color}
            hotelLat={hotel?.lat}
            hotelLng={hotel?.lng}
          />
          {daySpots.length >= 2 && (
            <button
              onClick={handleOptimize}
              style={{
                position: 'absolute',
                bottom: 10,
                left: 12,
                background: 'white',
                border: '1.5px solid var(--border)',
                borderRadius: 99,
                padding: '5px 12px',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                cursor: 'pointer',
                boxShadow: 'var(--shadow-md)',
                fontFamily: 'var(--font-body)',
              }}
            >
              <IconWand width={13} height={13} /> เรียงเส้นทาง
            </button>
          )}
        </div>

        {/* ── Scrollable list (hotel + search + itinerary) ── */}
        <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg)' }}>
          {/* Hotel + Search panel */}
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--border)',
              background: 'white',
            }}
          >
            <HotelRow
              current={hotel}
              country={trip.country}
              onSave={handleSetHotel}
              onClear={handleClearHotel}
            />
            <SearchBlock country={trip.country} onAdd={handleAddSpot} onPasteUrl={() => toast('เพิ่มจาก URL แล้ว! ✅', 'success')} />
          </div>

          {/* Itinerary */}
          <div style={{ padding: '12px 16px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span className="section-label">กำหนดการ · {daySpots.length} จุด</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>ลากเพื่อเรียงลำดับ</span>
            </div>
            <Timeline
              spots={daySpots}
              dayColor={color}
              onToggleCheck={handleToggleCheck}
              onTimeEdit={handleTimeEdit}
              onNoteEdit={handleNoteEdit}
              onDelete={(id) => removeSpot(id)}
              onReorder={handleReorder}
            />
          </div>

          {/* Big prev/next day footer — easier than the small chevrons in header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 10,
              padding: '8px 16px calc(var(--nav-h) + 24px)',
            }}
          >
            <button
              onClick={() => selectDay(Math.max(0, selectedDay - 1))}
              disabled={selectedDay === 0}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '14px 12px',
                background: 'white',
                border: '1.5px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 14,
                fontWeight: 600,
                color: selectedDay === 0 ? 'var(--text-muted)' : 'var(--text-primary)',
                cursor: selectedDay === 0 ? 'default' : 'pointer',
                fontFamily: 'var(--font-body)',
                opacity: selectedDay === 0 ? 0.45 : 1,
              }}
            >
              <IconChevLeft width={16} height={16} />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-muted)' }}>วันก่อนหน้า</div>
                <div>{selectedDay === 0 ? '—' : `วันที่ ${selectedDay}`}</div>
              </div>
            </button>
            <button
              onClick={() => selectDay(Math.min(totalDays - 1, selectedDay + 1))}
              disabled={selectedDay >= totalDays - 1}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '14px 12px',
                background: selectedDay >= totalDays - 1 ? 'white' : color,
                border: `1.5px solid ${selectedDay >= totalDays - 1 ? 'var(--border)' : 'transparent'}`,
                borderRadius: 'var(--radius-sm)',
                fontSize: 14,
                fontWeight: 600,
                color: selectedDay >= totalDays - 1 ? 'var(--text-muted)' : 'white',
                cursor: selectedDay >= totalDays - 1 ? 'default' : 'pointer',
                fontFamily: 'var(--font-body)',
                opacity: selectedDay >= totalDays - 1 ? 0.45 : 1,
              }}
            >
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 10, fontWeight: 500, opacity: 0.85 }}>วันถัดไป</div>
                <div>{selectedDay >= totalDays - 1 ? '—' : `วันที่ ${selectedDay + 2}`}</div>
              </div>
              <IconChevRight width={16} height={16} />
            </button>
          </div>
        </div>
      </div>

      <BottomNav />
      <ShareModal trip={trip} open={showShare} onClose={() => setShowShare(false)} />
    </>
  );
}

const iconBtnInline: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: 'var(--text-muted)',
  padding: '4px 4px 4px 0',
  display: 'flex',
  alignItems: 'center',
};

/* ─────────────────────────────────────────────────────────────
   Hotel row — collapsed pill or inline search
   ───────────────────────────────────────────────────────────── */
function HotelRow({
  current,
  country,
  onSave,
  onClear,
}: {
  current?: { name: string; lat: number; lng: number };
  country: string;
  onSave: (h: HotelResult) => void;
  onClear: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<HotelResult[]>([]);
  const [searching, setSearching] = useState(false);

  const search = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await fetch('/api/places/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: `hotel ${query}`, country }),
      });
      const data = await res.json();
      setResults((data.places || []).slice(0, 4));
    } catch {
      setResults([]);
    }
    setSearching(false);
  };

  if (!editing) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 12px',
          background: 'var(--bg)',
          borderRadius: 10,
          border: '1px solid var(--border)',
          marginBottom: 10,
        }}
      >
        <span style={{ fontSize: 16 }}>🏨</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 1 }}>จุดเริ่มต้น</p>
          <p
            style={{
              fontSize: 13,
              fontWeight: 600,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              color: current ? 'var(--text-primary)' : 'var(--text-muted)',
            }}
          >
            {current?.name || 'ระบุโรงแรมจุดเริ่มต้นของวันนี้'}
          </p>
        </div>
        <button
          onClick={() => setEditing(true)}
          style={{
            fontSize: 12,
            color: 'var(--accent)',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          {current ? 'เปลี่ยน' : 'เพิ่ม'}
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        marginBottom: 10,
        background: 'white',
        border: '1px solid var(--border)',
        borderRadius: 10,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <IconHotel width={14} height={14} />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search()}
          placeholder="ค้นหาโรงแรม..."
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            fontSize: 13,
            background: 'transparent',
            fontFamily: 'var(--font-body)',
          }}
        />
        <button
          onClick={search}
          disabled={searching}
          style={{
            background: 'var(--accent)',
            color: 'white',
            border: 'none',
            borderRadius: 7,
            padding: '4px 10px',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'var(--font-body)',
          }}
        >
          ค้นหา
        </button>
        <button
          onClick={() => { setEditing(false); setResults([]); setQuery(''); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}
        >
          <IconX width={14} height={14} />
        </button>
      </div>
      {searching && <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: 8 }}>กำลังค้นหา...</p>}
      {results.map((r, i) => (
        <button
          key={i}
          onClick={() => { onSave(r); setEditing(false); setResults([]); setQuery(''); }}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
            padding: '10px 12px',
            background: 'white',
            border: 'none',
            borderTop: i > 0 ? '1px solid var(--border)' : 'none',
            cursor: 'pointer',
            textAlign: 'left',
            fontFamily: 'var(--font-body)',
          }}
        >
          <span style={{ fontSize: 16, marginTop: 1 }}>🏨</span>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {r.name}
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {r.address}
            </p>
          </div>
        </button>
      ))}
      {current && (
        <button
          onClick={() => { onClear(); setEditing(false); }}
          style={{
            width: '100%',
            background: 'none',
            border: 'none',
            borderTop: '1px solid var(--border)',
            padding: '8px 12px',
            color: 'var(--red)',
            fontSize: 12,
            cursor: 'pointer',
            textAlign: 'left',
            fontFamily: 'var(--font-body)',
          }}
        >
          ลบโรงแรม
        </button>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Search block — input expands to a results panel + URL paste
   ───────────────────────────────────────────────────────────── */
function SearchBlock({
  country,
  onAdd,
  onPasteUrl,
}: {
  country: string;
  onAdd: (r: PlaceResult) => void;
  onPasteUrl: (url: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [searching, setSearching] = useState(false);

  // Debounced search — only fetches when there's something to query
  useEffect(() => {
    if (!expanded || !query.trim()) return;
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch('/api/places/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, country }),
        });
        const data = await res.json();
        setResults(data.places || []);
      } catch {
        setResults([]);
      }
      setSearching(false);
    }, 350);
    return () => clearTimeout(t);
  }, [query, country, expanded]);

  // When the panel collapses or query is cleared, drop stale results.
  // Done in event handlers (collapse / X button) below — see setExpanded(false)
  // sites — keeping this side effect out of the render path.

  return (
    <div>
      <div
        className="search-bar"
        style={{
          background: 'var(--bg)',
          borderColor: expanded ? 'var(--accent)' : 'var(--border)',
        }}
      >
        <div style={{ color: 'var(--text-muted)', display: 'flex', flexShrink: 0 }}>
          <IconSearch width={16} height={16} />
        </div>
        <input
          placeholder="ค้นหาสถานที่เพิ่ม..."
          value={query}
          onFocus={() => setExpanded(true)}
          onChange={(e) => { setQuery(e.target.value); setExpanded(true); }}
          style={{ fontSize: 14, flex: 1 }}
        />
        {expanded && (
          <button
            onClick={() => { setExpanded(false); setQuery(''); setResults([]); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', flexShrink: 0 }}
          >
            <IconX width={14} height={14} />
          </button>
        )}
      </div>

      {/* Quick-add URL row */}
      {expanded && (
        <div
          style={{
            marginTop: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            background: 'var(--accent-light)',
            borderRadius: 10,
            border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)',
          }}
        >
          <span style={{ color: 'var(--accent)', display: 'flex', flexShrink: 0 }}>
            <IconLink width={14} height={14} />
          </span>
          <input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="วาง Google Maps URL เพื่อเพิ่มอัตโนมัติ..."
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              fontSize: 13,
              outline: 'none',
              fontFamily: 'var(--font-body)',
              color: 'var(--text-primary)',
            }}
          />
          {urlInput && (
            <button
              onClick={() => { onPasteUrl(urlInput); setUrlInput(''); setExpanded(false); }}
              style={{
                background: 'var(--accent)',
                color: 'white',
                border: 'none',
                borderRadius: 7,
                padding: '4px 10px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                flexShrink: 0,
                fontFamily: 'var(--font-body)',
              }}
            >
              เพิ่ม
            </button>
          )}
        </div>
      )}

      {/* Inline results */}
      {expanded && (
        <div
          style={{
            marginTop: 6,
            background: 'white',
            borderRadius: 10,
            border: '1px solid var(--border)',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          {searching && (
            <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              กำลังค้นหา...
            </div>
          )}
          {!searching && results.length === 0 && query && (
            <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              ไม่พบสถานที่
            </div>
          )}
          {results.map((r, i) => (
            <button
              key={`${r.name}-${i}`}
              onClick={() => {
                onAdd(r);
                setExpanded(false);
                setQuery('');
                setResults([]);
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                borderBottom: i < results.length - 1 ? '1px solid var(--border)' : 'none',
                background: 'white',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: 'var(--font-body)',
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 9,
                  background: 'var(--accent-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                  flexShrink: 0,
                }}
              >
                📍
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {r.name}
                </p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {r.address}
                </p>
              </div>
              <span
                style={{
                  background: 'var(--accent)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  padding: '5px 12px',
                  fontSize: 12,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                + เพิ่ม
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
