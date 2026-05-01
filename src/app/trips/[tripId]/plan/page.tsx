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
import { ChevronLeft, ChevronRight, LayoutGrid, Share2, Wand2, MapPinned, FileText } from 'lucide-react';

function guessAreaFromSpots(daySpots: { address?: string }[]): string {
  if (daySpots.length === 0) return '';
  const areas = daySpots
    .map(s => s.address || '')
    .filter(Boolean)
    .map(addr => {
      const parts = addr.split(',').map(p => p.trim());
      return parts.length >= 3 ? parts[parts.length - 3] : parts.length >= 2 ? parts[parts.length - 2] : parts[0];
    })
    .filter(Boolean);

  const freq: Record<string, number> = {};
  areas.forEach(a => { freq[a] = (freq[a] || 0) + 1; });
  const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) return '';
  if (sorted.length === 1) return sorted[0][0];
  return `${sorted[0][0]}, ${sorted[1][0]}`;
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

  // Editable day meta state
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
    const daySpots = spots.filter(s => daySpotIds.includes(s.id));
    return daySpots.sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999));
  }, [groups, spots]);

  const getDayColor = (dayIdx: number) => GROUP_COLORS[dayIdx % GROUP_COLORS.length];

  // Load day meta when switching days
  useEffect(() => {
    if (selectedDay === null) return;
    const meta = getMeta(selectedDay);
    const daySpots = getDaySpots(selectedDay);
    setEditArea(meta?.area || guessAreaFromSpots(daySpots));
    setEditDesc(meta?.description || '');
    setMetaDirty(false);
  }, [selectedDay, getMeta, getDaySpots]);

  // Auto-save meta on blur or day switch
  const saveMeta = useCallback(async () => {
    if (selectedDay === null || !metaDirty) return;
    await updateMeta(selectedDay, { area: editArea, description: editDesc });
    setMetaDirty(false);
  }, [selectedDay, editArea, editDesc, metaDirty, updateMeta]);

  const handleToggleCheck = useCallback(async (spotId: string) => {
    const spot = spots.find(s => s.id === spotId);
    if (spot) {
      await updateSpot(spotId, { checked: !spot.checked });
    }
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

  const handleAddSpot = useCallback(async (result: { name: string; lat: number; lng: number; address: string; type: string; hours: string; rating: number | null }) => {
    if (selectedDay === null) return;
    const dayGroups = groups.filter(g => g.assignedDay === selectedDay);
    await addSpot({
      name: result.name,
      lat: result.lat,
      lng: result.lng,
      type: result.type as import('@/types').SpotType,
      address: result.address,
      hours: result.hours,
      rating: result.rating ?? undefined,
      source: 'search',
      groupId: dayGroups[0]?.id,
      dayIdx: selectedDay,
      sortOrder: getDaySpots(selectedDay).length,
    });
    toast(`Added "${result.name}"!`, 'success');
  }, [selectedDay, groups, addSpot, getDaySpots, toast]);

  if (!trip) return null;

  // Overview mode
  if (selectedDay === null) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{trip.title}</h2>
            <p className="text-sm text-gray-500">{trip.startDate} — {trip.endDate}</p>
          </div>
          <button
            onClick={() => setShowShare(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors text-sm font-medium text-gray-700"
          >
            <Share2 size={16} /> Share
          </button>
        </div>

        <Overview
          trip={trip}
          spots={spots}
          groups={groups}
          dayMetas={dayMetas}
          onDaySelect={setSelectedDay}
        />

        <ShareModal trip={trip} open={showShare} onClose={() => setShowShare(false)} />
      </div>
    );
  }

  // Day view
  const daySpots = getDaySpots(selectedDay);
  const dayColor = getDayColor(selectedDay);
  const dayDate = new Date(trip.startDate);
  dayDate.setDate(dayDate.getDate() + selectedDay);

  return (
    <div className="h-[calc(100vh-8rem)]">
      {/* Day header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { saveMeta(); setSelectedDay(null); }}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LayoutGrid size={18} className="text-gray-500" />
            </button>
            <button
              onClick={() => { saveMeta(); setSelectedDay(Math.max(0, selectedDay - 1)); }}
              disabled={selectedDay === 0}
              className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
            >
              <ChevronLeft size={18} className="text-gray-500" />
            </button>
            <div>
              <h3 className="font-bold text-gray-900">Day {selectedDay + 1}</h3>
              <p className="text-xs text-gray-500">
                {dayDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                {' · '}{daySpots.length} spots
              </p>
            </div>
            <button
              onClick={() => { saveMeta(); setSelectedDay(Math.min(totalDays - 1, selectedDay + 1)); }}
              disabled={selectedDay >= totalDays - 1}
              className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
            >
              <ChevronRight size={18} className="text-gray-500" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOptimize}
              disabled={daySpots.length < 2}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors text-xs font-medium disabled:opacity-40"
            >
              <Wand2 size={14} /> Optimize
            </button>
            <button
              onClick={() => setShowShare(true)}
              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"
            >
              <Share2 size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-4 flex gap-4 h-[calc(100%-4rem)]">
        {/* Timeline */}
        <div className="w-96 flex-shrink-0 overflow-y-auto scrollbar-thin">
          {/* Area + Description editable fields */}
          <div className="mb-4 space-y-2">
            <div className="flex items-center gap-2">
              <MapPinned size={14} className="text-blue-500 flex-shrink-0" />
              <input
                type="text"
                value={editArea}
                onChange={(e) => { setEditArea(e.target.value); setMetaDirty(true); }}
                onBlur={saveMeta}
                placeholder="Area / ย่าน (e.g. Shibuya, Shinjuku)"
                className="flex-1 text-sm text-blue-600 bg-blue-50/50 border border-blue-100 rounded-lg px-3 py-1.5 focus:ring-1 focus:ring-blue-300 focus:border-blue-300 outline-none placeholder:text-blue-300"
              />
            </div>
            <div className="flex items-start gap-2">
              <FileText size={14} className="text-gray-400 flex-shrink-0 mt-1.5" />
              <textarea
                value={editDesc}
                onChange={(e) => { setEditDesc(e.target.value); setMetaDirty(true); }}
                onBlur={saveMeta}
                placeholder="Day description / โน้ตสำหรับวันนี้..."
                rows={2}
                className="flex-1 text-sm text-gray-600 bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5 focus:ring-1 focus:ring-gray-300 focus:border-gray-300 outline-none placeholder:text-gray-300 resize-none"
              />
            </div>
          </div>

          <div className="mb-4">
            <PlaceSearch
              country={trip.country}
              onAdd={handleAddSpot}
            />
          </div>
          <Timeline
            spots={daySpots}
            dayColor={dayColor}
            onToggleCheck={handleToggleCheck}
            onTimeEdit={handleTimeEdit}
            onDelete={(id) => removeSpot(id)}
          />
        </div>

        {/* Map */}
        <div className="flex-1 rounded-xl overflow-hidden border border-gray-200">
          <PlanMap
            spots={daySpots}
            dayColor={dayColor}
            selectedSpotId={selectedSpotId}
            onSpotSelect={setSelectedSpotId}
          />
        </div>
      </div>

      <ShareModal trip={trip} open={showShare} onClose={() => setShowShare(false)} />
    </div>
  );
}
