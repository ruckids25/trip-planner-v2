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
  MapPinned, FileText, Hotel, Search, X, Check,
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
          <div className="flex items-center gap-2.5 px-3 py-2.5 bg-slate-800 rounded-xl">
            <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center text-sm flex-shrink-0">🏨</div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-slate-400 leading-none mb-0.5">จุดเริ่มต้น</p>
              <p className="text-sm font-semibold text-white truncate">{current.name}</p>
            </div>
            <button onClick={() => setEditing(true)} className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0">เปลี่ยน</button>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="w-full flex items-center gap-2 px-3 py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors text-sm"
          >
            <Hotel size={15} />
            <span>ระบุโรงแรมจุดเริ่มต้นของวันนี้</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="mb-3 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
        <Hotel size={14} className="text-gray-400" />
        <input
          autoFocus
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search()}
          placeholder="ค้นหาโรงแรม..."
          className="flex-1 text-sm outline-none placeholder:text-gray-300"
        />
        <button onClick={search} disabled={searching} className="p-1 text-blue-500 hover:bg-blue-50 rounded"><Search size={14}/></button>
        <button onClick={() => { setEditing(false); setResults([]); setQuery(''); }} className="p-1 text-gray-400 hover:bg-gray-100 rounded"><X size={14}/></button>
      </div>
      {results.map((r, i) => (
        <button key={i} onClick={() => { onSave(r); setEditing(false); setResults([]); setQuery(''); }}
          className="w-full flex items-start gap-2 px-3 py-2 hover:bg-blue-50 transition-colors text-left border-b border-gray-50 last:border-0">
          <span className="text-base mt-0.5">🏨</span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{r.name}</p>
            <p className="text-xs text-gray-400 truncate">{r.address}</p>
          </div>
        </button>
      ))}
      {searching && <p className="text-xs text-gray-400 text-center py-2">กำลังค้นหา...</p>}
      {current && (
        <button onClick={() => { onClear(); setEditing(false); }}
          className="w-full text-xs text-red-400 hover:text-red-600 px-3 py-2 hover:bg-red-50 transition-colors text-left border-t border-gray-100">
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
    toast('Time updated', 'success');
  }, [updateSpot, toast]);

  const handleOptimize = useCallback(async () => {
    if (selectedDay === null) return;
    const daySpots = getDaySpots(selectedDay);
    const optimized = optimizeRoute(daySpots);
    for (let i = 0; i < optimized.length; i++) {
      await updateSpot(optimized[i].id, { sortOrder: i });
    }
    toast('Route optimized!', 'success');
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
    toast(`Added "${result.name}"!`, 'success');
  }, [selectedDay, groups, addSpot, getDaySpots, toast]);

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
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{trip.title}</h2>
            <p className="text-sm text-gray-500">{trip.startDate} — {trip.endDate}</p>
          </div>
          <button onClick={() => setShowShare(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors text-sm font-medium text-gray-700">
            <Share2 size={16}/> Share
          </button>
        </div>
        <Overview trip={trip} spots={spots} groups={groups} dayMetas={dayMetas} onDaySelect={setSelectedDay}/>
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
  const dayOfWeek = ['SUN','MON','TUE','WED','THU','FRI','SAT'][dayDate.getDay()];
  const dateStr = `DAY ${selectedDay + 1} · ${dayDate.getDate()} ${['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][dayDate.getMonth()]} ${dayOfWeek}`;

  return (
    <div className="flex flex-col bg-gray-50" style={{ height: 'calc(100vh - 4rem)' }}>

      {/* ── Day header ── */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex-shrink-0">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => { saveMeta(); setSelectedDay(null); }}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              <LayoutGrid size={18} className="text-gray-500"/>
            </button>
            <button onClick={() => { saveMeta(); setSelectedDay(Math.max(0, selectedDay - 1)); }}
              disabled={selectedDay === 0} className="p-1 hover:bg-gray-100 rounded disabled:opacity-30">
              <ChevronLeft size={18} className="text-gray-500"/>
            </button>
            <div>
              <p className="text-[10px] font-bold tracking-widest text-gray-400">{dateStr}</p>
              <div className="flex items-center gap-1.5">
                {editArea ? (
                  <h3 className="font-bold text-gray-900 text-sm leading-tight">{editArea}</h3>
                ) : (
                  <h3 className="text-sm font-bold text-gray-900">{daySpots.length} spots</h3>
                )}
              </div>
            </div>
            <button onClick={() => { saveMeta(); setSelectedDay(Math.min(totalDays - 1, selectedDay + 1)); }}
              disabled={selectedDay >= totalDays - 1} className="p-1 hover:bg-gray-100 rounded disabled:opacity-30">
              <ChevronRight size={18} className="text-gray-500"/>
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={handleOptimize} disabled={daySpots.length < 2}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 text-xs font-medium disabled:opacity-40">
              <Wand2 size={14}/> Optimize
            </button>
            <button onClick={() => setShowShare(true)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">
              <Share2 size={16}/>
            </button>
          </div>
        </div>
      </div>

      {/* ── Main content: map-on-top mobile, side-by-side desktop ── */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">

        {/* MAP — top on mobile (fixed height), right panel on desktop */}
        <div className="h-[260px] md:h-auto md:flex-1 flex-shrink-0 order-1 md:order-2 relative">
          <PlanMap
            spots={daySpots}
            dayColor={dayColor}
            hotelLat={hotel?.lat}
            hotelLng={hotel?.lng}
            selectedSpotId={selectedSpotId}
            onSpotSelect={setSelectedSpotId}
          />
          {/* Optimize button floating on map - mobile only */}
          {daySpots.length >= 2 && (
            <button onClick={handleOptimize}
              className="sm:hidden absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 bg-white shadow-md text-purple-600 rounded-xl text-xs font-semibold border border-purple-100">
              <Wand2 size={13}/> เรียงเส้นทาง
            </button>
          )}
        </div>

        {/* LIST PANEL — scrollable bottom on mobile, left panel on desktop */}
        <div className="flex-1 md:flex-none md:w-96 md:flex-shrink-0 overflow-y-auto order-2 md:order-1 bg-gray-50">
          <div className="px-4 pt-4 pb-2 space-y-3">

            {/* Hotel row */}
            <HotelSearchRow
              current={hotel}
              country={trip.country}
              onSave={handleSetHotel}
              onClear={handleClearHotel}
            />

            {/* Search */}
            <PlaceSearch country={trip.country} onAdd={handleAddSpot}/>

            {/* Itinerary header */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-bold tracking-widest text-gray-500">ITINERARY</span>
              <span className="text-xs text-gray-400">ลากเพื่อจัดลำดับใหม่</span>
            </div>

            {/* Area + description (collapsible on mobile) */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <MapPinned size={13} className="text-blue-500 flex-shrink-0"/>
                <input type="text" value={editArea}
                  onChange={e => { setEditArea(e.target.value); setMetaDirty(true); }}
                  onBlur={saveMeta}
                  placeholder="ย่าน / Area"
                  className="flex-1 text-xs text-blue-600 bg-blue-50/50 border border-blue-100 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-blue-300 outline-none placeholder:text-blue-200"/>
              </div>
              <div className="flex items-start gap-2">
                <FileText size={13} className="text-gray-300 flex-shrink-0 mt-1.5"/>
                <textarea value={editDesc}
                  onChange={e => { setEditDesc(e.target.value); setMetaDirty(true); }}
                  onBlur={saveMeta}
                  placeholder="โน้ตสำหรับวันนี้..."
                  rows={2}
                  className="flex-1 text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-gray-300 outline-none placeholder:text-gray-300 resize-none"/>
              </div>
            </div>
          </div>

          {/* Spot count badge */}
          <div className="px-4 pb-2 flex items-center gap-2">
            <span className="text-xs font-medium text-gray-400">· {daySpots.length} จุด</span>
          </div>

          {/* Timeline */}
          <div className="px-4 pb-6">
            <Timeline
              spots={daySpots}
              dayColor={dayColor}
              onToggleCheck={handleToggleCheck}
              onTimeEdit={handleTimeEdit}
              onDelete={(id) => removeSpot(id)}
            />
          </div>
        </div>
      </div>

      <ShareModal trip={trip} open={showShare} onClose={() => setShowShare(false)}/>
    </div>
  );
}
