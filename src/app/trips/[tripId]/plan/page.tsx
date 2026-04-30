'use client';

import { useState, useCallback, useMemo, use } from 'react';
import { useTrip } from '@/hooks/useTrip';
import { useSpots } from '@/hooks/useSpots';
import { useGroups } from '@/hooks/useGroups';
import { useToast } from '@/components/ui/Toast';
import Timeline from '@/components/plan/Timeline';
import PlanMap from '@/components/plan/PlanMap';
import PlaceSearch from '@/components/plan/PlaceSearch';
import Overview from '@/components/plan/Overview';
import ShareModal from '@/components/plan/ShareModal';
import { optimizeRoute } from '@/lib/route-optimizer';
import { GROUP_COLORS } from '@/types';
import { ChevronLeft, ChevronRight, LayoutGrid, Share2, Wand2 } from 'lucide-react';

export default function PlanPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = use(params);
  const { trip } = useTrip(tripId);
  const { spots, update: updateSpot, add: addSpot, remove: removeSpot } = useSpots(tripId);
  const { groups } = useGroups(tripId);
  const { toast } = useToast();

  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [showShare, setShowShare] = useState(false);
  const [selectedSpotId, setSelectedSpotId] = useState<string>();

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
              onClick={() => setSelectedDay(null)}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LayoutGrid size={18} className="text-gray-500" />
            </button>
            <button
              onClick={() => setSelectedDay(Math.max(0, selectedDay - 1))}
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
              onClick={() => setSelectedDay(Math.min(totalDays - 1, selectedDay + 1))}
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
