'use client';

import { useState, useCallback, useMemo, useEffect, use } from 'react';
import { useTrip } from '@/hooks/useTrip';
import { useSpots } from '@/hooks/useSpots';
import { useGroups } from '@/hooks/useGroups';
import { useDayMeta } from '@/hooks/useDayMeta';
import { useToast } from '@/components/ui/Toast';
import Timeline from '@/components/plan/Timeline';
import PlanMap from '@/components/plan/PlanMap';
import PlaceSearch from '@/components/plan/PlaceSearch';
import Overview from '@/components/plan/Overview';
import ShareModal from '@/components/plan/ShareModal';
import { optimizeRoute } from '@/lib/route-optimizer';
import { GROUP_COLORS } from '@/types';
import {
  ChevronLeft, ChevronRight, LayoutGrid, Share2, Wand2,
  MapPinned, FileText, Hotel, Search, X,
} from 'lucide-react';

function guessAreaFromSpots(daySpots: { address?: string }[]): string {
  if (daySpots.length === 0) return '';
  const areas = daySpots.map(s => s.address || '').filter(Boolean).map(addr => {
    const parts = addr.split(',').map(p => p.trim());
    return parts.length >= 3 ? parts[parts.length - 3] : parts.length >= 2 ? parts[parts.length - 2] : parts[0];
  }).filter(Boolean);
  const freq: Record<string, number> = {};
  areas.forEach(a => { freq[a] = (freq[a] || 0) + 1; });
  const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) return '';
  return sorted.length === 1 ? sorted[0][0] : `${sorted[0][0]}, ${sorted[1][0]}`;
}

interface HotelResult { name: string; lat: number; lng: number; address: string; }

function HotelSearchRow({
  current, country, onSave, onClear,
}: { current?: { name: string; lat: number; lng: number }; country: string; onSave: (h: HotelResult) => void; onClear: () => void }) {
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
      setResults((data.places || []).slice(0, 4).map((p: { name: string; lat: number; lng: number; address: string }) => ({
        name: p.name, lat: p.lat, lng: p.lng, address: p.address,
      })));
    } catch { setResults([]); }
    setSearching(false);
  };

  if (!editing) {
    return (
      <div className="mb-3">
        {current ? (
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
            style={{ background: 'linear-gradient(135deg, #312e81, #1e40af)' }}>
            <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center text-sm flex-shrink-0">🏨</div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-white/60 leading-none mb-0.5 font-semibold uppercase tracking-wider">จุดเริ่มต้น</p>
              <p className="text-sm font-semibold text-white truncate">{current.name}</p>
            </div>
            <button onClick={() => setEditing(true)}
              className="text-xs text-white/70 hover:text-white px-2 py-1 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0">
              เปลี่ยน
            </button>
          </div>
        ) : (
          <button onClick={() => setEditing(true)}
            className="w-full flex items-center gap-2 px-3 py-2.5 border-2 border-dashed rounded-xl transition-colors text-sm"
            style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
            <Hotel size={15}/> ระบุโรงแรมจุดเริ่มต้น
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="mb-3 bg-white border border-[var(--border)] rounded-xl overflow-hidden"
      style={{ boxShadow: 'var(--shadow-sm)' }}>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border)]">
        <Hotel size={14} className="text-[var(--text-muted)]"/>
        <input autoFocus value={query} onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search()}
          placeholder="ค้นหาโรงแรม..."
          className="flex-1 text-sm outline-none placeholder:text-[var(--text-muted)]"
          style={{ fontFamily: 'var(--font-body)' }}/>
        <button onClick={search} disabled={searching}
          className="p-1 rounded-lg transition-colors"
          style={{ color: 'var(--accent)' }}>
          <Search size={14}/>
        </button>
        <button onClick={() => { setEditing(false); setResults([]); setQuery(''); }}
          className="p-1 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg)] transition-colors">
          <X size={14}/>
        </button>
      </div>
      {results.map((r, i) => (
        <button key={i} onClick={() => { onSave(r); setEditing(false); setResults([]); setQuery(''); }}
          className="w-full flex items-start gap-2 px-3 py-2.5 transition-colors text-left border-b border-[var(--border)] last:border-0"
          style={{ background: 'white' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-light)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
          <span className="text-base mt-0.5">🏨</span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{r.name}</p>
            <p className="text-xs text-[var(--text-muted)] truncate">{r.address}</p>
          </div>
        </button>
      ))}
      {searching && <p className="text-xs text-[var(--text-muted)] text-center py-3">กำลังค้นหา...</p>}
      {current && (
        <button onClick={() => { onClear(); setEditing(false); }}
          className="w-full text-xs px-3 py-2 transition-colors text-left border-t border-[var(--border)]"
          style={{ color: 'var(--red)' }}>
          ลบโรงแรม
        </button>
      )}
    </div>
  );
}

export default function PlanPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = use(params);
  const { trip } = useTrip(tripId);
  const { spots, update: updateSpot, add: addSpot, remove: removeSpot } = useSpots(tripId);
  const { groups } = useGroups(tripId);
  const { dayMetas, getMeta, updateMeta } = useDayMeta(tripId);
  const { toast } = useToast();

  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [showShare, setShowShare] = useState(false);
  const [selectedSpotId, setSelectedSpotId] = useState<string>();
  const [editArea, setEditArea] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [metaDirty, setMetaDirty] = useState(false);

  const totalDays = useMemo(() => {
    if (!trip) return 0;
    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);
    return Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1;
  }, [trip]);

  const getDaySpots = useCallback((dayIdx: number) => {
    const dayGroups = groups.filter(g => g.assignedDay === dayIdx);
    const daySpotIds = dayGroups.flatMap(g => g.spotIds);
    return spots.filter(s => daySpotIds.includes(s.id)).sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999));
  }, [groups, spots]);

  const getDayColor = (dayIdx: number) => GROUP_COLORS[dayIdx % GROUP_COLORS.length];

  useEffect(() => {
    if (selectedDay === null) return;
    const meta = getMeta(selectedDay);
    const daySpots = getDaySpots(selectedDay);
    setEditArea(meta?.area || guessAreaFromSpots(daySpots));
    setEditDesc(meta?.description || '');
    setMetaDirty(false);
  }, [selectedDay, getMeta, getDaySpots]);

  const saveMeta = useCallback(async () => {
    if (selectedDay === null || !metaDirty) return;
    await updateMeta(selectedDay, { area: editArea, description: editDesc });
    setMetaDirty(false);
  }, [selectedDay, editArea, editDesc, metaDirty, updateMeta]);

  const handleToggleCheck = useCallback(async (spotId: string) => {
    const spot = spots.find(s => s.id === spotId);
    if (spot) await updateSpot(spotId, { checked: !spot.checked });
  }, [spots, updateSpot]);

  const handleTimeEdit = useCallback(async (spotId: string, time: string) => {
    await updateSpot(spotId, { timeOverride: time });
    toast('อัปเดตเวลาแล้ว', 'success');
  }, [updateSpot, toast]);

  const handleNoteEdit = useCallback(async (spotId: string, note: string) => {
    await updateSpot(spotId, { note });
    toast('บันทึกโน้ตแล้ว', 'success');
  }, [updateSpot, toast]);

  const handleOptimize = useCallback(async () => {
    if (selectedDay === null) return;
    const daySpots = getDaySpots(selectedDay);
    const optimized = optimizeRoute(daySpots);
    for (let i = 0; i < optimized.length; i++) {
      await updateSpot(optimized[i].id, { sortOrder: i });
    }
    toast('เรียงเส้นทางแล้ว!', 'success');
  }, [selectedDay, getDaySpots, updateSpot, toast]);

  const handleAddSpot = useCallback(async (result: {
    name: string; lat: number; lng: number; address: string;
    type: string; hours: string; rating: number | null;
  }) => {
    if (selectedDay === null) return;
    const dayGroups = groups.filter(g => g.assignedDay === selectedDay);
    await addSpot({
      name: result.name, lat: result.lat, lng: result.lng,
      type: result.type as import('@/types').SpotType,
      address: result.address, hours: result.hours,
      rating: result.rating ?? undefined, source: 'search',
      groupId: dayGroups[0]?.id, dayIdx: selectedDay,
      sortOrder: getDaySpots(selectedDay).length,
    });
    toast(`เพิ่ม "${result.name}" แล้ว!`, 'success');
  }, [selectedDay, groups, addSpot, getDaySpots, toast]);

  const handleReorder = useCallback(async (fromIdx: number, toIdx: number) => {
    if (selectedDay === null) return;
    const daySpots = getDaySpots(selectedDay);
    const reordered = [...daySpots];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    await Promise.all(
      reordered.map((s, i) => s.sortOrder !== i ? updateSpot(s.id, { sortOrder: i }) : Promise.resolve())
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

  // ─── Overview mode ───
  if (selectedDay === null) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
        {/* Header */}
        <div className="bg-white border-b border-[var(--border)] px-4 py-3 sticky top-0 z-10"
          style={{ boxShadow: 'var(--shadow-sm)' }}>
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">แผนทริป</p>
              <h2 className="text-base font-bold text-[var(--text-primary)]"
                style={{ fontFamily: 'var(--font-head)' }}>
                {trip.title}
              </h2>
            </div>
            <button onClick={() => setShowShare(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors"
              style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
              <Share2 size={15}/> แชร์
            </button>
          </div>
        </div>
        <div className="max-w-2xl mx-auto px-4 py-5 pb-24">
          <Overview trip={trip} spots={spots} groups={groups} dayMetas={dayMetas} onDaySelect={setSelectedDay}/>
        </div>
        <ShareModal trip={trip} open={showShare} onClose={() => setShowShare(false)}/>
      </div>
    );
  }

  // ─── Day view ───
  const daySpots = getDaySpots(selectedDay);
  const dayColor = getDayColor(selectedDay);
  const dayDate = new Date(trip.startDate);
  dayDate.setDate(dayDate.getDate() + selectedDay);
  const meta = getMeta(selectedDay);
  const hotel = meta?.hotelLat ? { name: meta.hotelName!, lat: meta.hotelLat, lng: meta.hotelLng! } : undefined;
  const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const DOWS = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
  const dateStr = `DAY ${selectedDay + 1} · ${dayDate.getDate()} ${MONTHS[dayDate.getMonth()]} ${DOWS[dayDate.getDay()]}`;

  return (
    <div className="flex flex-col" style={{ height: 'calc(100dvh)', background: 'var(--bg)' }}>

      {/* ── Day header ── */}
      <div className="bg-white border-b border-[var(--border)] px-4 pt-3 pb-0 flex-shrink-0"
        style={{ boxShadow: 'var(--shadow-sm)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            {/* Left: back + prev/next + title */}
            <div className="flex items-center gap-1.5">
              <button onClick={() => { saveMeta(); setSelectedDay(null); }}
                className="p-1.5 hover:bg-[var(--bg)] rounded-xl transition-colors">
                <LayoutGrid size={18} style={{ color: 'var(--text-muted)' }}/>
              </button>
              <button onClick={() => { saveMeta(); setSelectedDay(Math.max(0, selectedDay - 1)); }}
                disabled={selectedDay === 0}
                className="p-1.5 hover:bg-[var(--bg)] rounded-xl transition-colors disabled:opacity-30">
                <ChevronLeft size={18} style={{ color: 'var(--text-muted)' }}/>
              </button>
              <div>
                <p className="text-[9px] font-bold tracking-widest" style={{ color: 'var(--text-muted)' }}>
                  {dateStr}
                </p>
                <h3 className="font-bold text-sm text-[var(--text-primary)] leading-tight"
                  style={{ fontFamily: 'var(--font-head)' }}>
                  {editArea || `${daySpots.length} สถานที่`}
                </h3>
              </div>
              <button onClick={() => { saveMeta(); setSelectedDay(Math.min(totalDays - 1, selectedDay + 1)); }}
                disabled={selectedDay >= totalDays - 1}
                className="p-1.5 hover:bg-[var(--bg)] rounded-xl transition-colors disabled:opacity-30">
                <ChevronRight size={18} style={{ color: 'var(--text-muted)' }}/>
              </button>
            </div>

            {/* Right: optimize + share */}
            <div className="flex items-center gap-1.5">
              <button onClick={handleOptimize} disabled={daySpots.length < 2}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold disabled:opacity-40 transition-colors"
                style={{ background: '#EDE9FE', color: '#7C3AED' }}>
                <Wand2 size={13}/> เรียงเส้นทาง
              </button>
              <button onClick={() => setShowShare(true)}
                className="p-2 hover:bg-[var(--bg)] rounded-xl transition-colors"
                style={{ color: 'var(--text-muted)' }}>
                <Share2 size={16}/>
              </button>
            </div>
          </div>

          {/* Day dot navigation */}
          <div className="flex items-center gap-1.5 pb-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {Array.from({ length: totalDays }, (_, i) => (
              <button
                key={i}
                onClick={() => { saveMeta(); setSelectedDay(i); }}
                className="day-nav-dot transition-all flex-shrink-0"
                style={{
                  width: i === selectedDay ? 20 : 7,
                  background: i === selectedDay ? dayColor : 'var(--border)',
                  cursor: 'pointer',
                  border: 'none',
                  padding: 0,
                }}
                title={`Day ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Main content: map-on-top mobile, side-by-side desktop ── */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">

        {/* MAP — top on mobile, right on desktop */}
        <div className="h-[220px] md:h-auto md:flex-1 flex-shrink-0 order-1 md:order-2 relative">
          <PlanMap
            spots={daySpots}
            dayColor={dayColor}
            hotelLat={hotel?.lat}
            hotelLng={hotel?.lng}
            selectedSpotId={selectedSpotId}
            onSpotSelect={setSelectedSpotId}
          />
          {daySpots.length >= 2 && (
            <button onClick={handleOptimize}
              className="sm:hidden absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-xl text-xs font-semibold border"
              style={{ color: '#7C3AED', borderColor: '#DDD6FE', boxShadow: 'var(--shadow-md)' }}>
              <Wand2 size={13}/> เรียงเส้นทาง
            </button>
          )}
        </div>

        {/* LIST PANEL — scrollable */}
        <div className="flex-1 md:flex-none md:w-96 md:flex-shrink-0 overflow-y-auto order-2 md:order-1"
          style={{ background: 'var(--bg)' }}>
          <div className="px-4 pt-4 pb-2 space-y-3">

            <HotelSearchRow current={hotel} country={trip.country} onSave={handleSetHotel} onClear={handleClearHotel}/>
            <PlaceSearch country={trip.country} onAdd={handleAddSpot}/>

            <div className="flex items-center justify-between pt-1">
              <span className="section-label">ITINERARY</span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>ลากเพื่อจัดลำดับ</span>
            </div>

            {/* Area + description */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <MapPinned size={13} style={{ color: 'var(--accent)', flexShrink: 0 }}/>
                <input type="text" value={editArea}
                  onChange={e => { setEditArea(e.target.value); setMetaDirty(true); }}
                  onBlur={saveMeta}
                  placeholder="ย่าน / Area"
                  className="flex-1 text-xs rounded-xl px-2.5 py-1.5 outline-none transition-colors"
                  style={{
                    background: 'var(--accent-light)', border: '1px solid #C7D2FE',
                    color: 'var(--accent)', fontFamily: 'var(--font-body)',
                  }}/>
              </div>
              <div className="flex items-start gap-2">
                <FileText size={13} style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: 6 }}/>
                <textarea value={editDesc}
                  onChange={e => { setEditDesc(e.target.value); setMetaDirty(true); }}
                  onBlur={saveMeta}
                  placeholder="โน้ตสำหรับวันนี้..."
                  rows={2}
                  className="flex-1 text-xs rounded-xl px-2.5 py-1.5 outline-none resize-none transition-colors"
                  style={{
                    background: 'var(--bg)', border: '1px solid var(--border)',
                    color: 'var(--text-secondary)', fontFamily: 'var(--font-body)',
                  }}/>
              </div>
            </div>
          </div>

          <div className="px-4 pb-1">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>· {daySpots.length} จุด</span>
          </div>

          <div className="px-4 pb-6">
            <Timeline
              spots={daySpots}
              dayColor={dayColor}
              onToggleCheck={handleToggleCheck}
              onTimeEdit={handleTimeEdit}
              onNoteEdit={handleNoteEdit}
              onDelete={(id) => removeSpot(id)}
              onReorder={handleReorder}
            />
          </div>
        </div>
      </div>

      <ShareModal trip={trip} open={showShare} onClose={() => setShowShare(false)}/>
    </div>
  );
}
