'use client';

import { useState, useCallback, useMemo, useEffect, use } from 'react';
import { Trip, Spot, Group, DayMeta, SPOT_TYPE_CONFIG, GROUP_COLORS } from '@/types';
import { getTrip, getSpots, getGroups, getDayMetas, updateSpot } from '@/lib/firestore';
import { calculateTotalDistance } from '@/lib/route-optimizer';
import PlanMap from '@/components/plan/PlanMap';
import {
  MapPin, Check, Route, Calendar, MapPinned, ChevronLeft, ChevronRight,
  LayoutGrid, Clock, ExternalLink, Pencil,
} from 'lucide-react';

// ─── Read-only (or editable) shared trip page — no auth required ───

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
  const [selectedSpotId, setSelectedSpotId] = useState<string>();
  // Mobile: toggle between list and map tabs


  useEffect(() => {
    async function load() {
      try {
        const t = await getTrip(tripId);
        if (!t) { setError('Trip not found'); setLoading(false); return; }
        if (!t.isShared) { setError('This trip is not shared'); setLoading(false); return; }
        setTrip(t);

        const [s, g, m] = await Promise.all([
          getSpots(tripId),
          getGroups(tripId),
          getDayMetas(tripId),
        ]);
        setSpots(s);
        setGroups(g);
        setDayMetas(m);
      } catch (err) {
        console.error('Failed to load shared trip:', err);
        setError('Unable to load this trip. It may not be shared or may have been removed.');
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
    const dayGroups = groups.filter(g => g.assignedDay === dayIdx);
    const daySpotIds = dayGroups.flatMap(g => g.spotIds);
    const daySpots = spots.filter(s => daySpotIds.includes(s.id));
    return daySpots.sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999));
  }, [groups, spots]);

  const getDayColor = (dayIdx: number) => GROUP_COLORS[dayIdx % GROUP_COLORS.length];

  // Edit mode: toggle check
  const handleToggleCheck = useCallback(async (spotId: string) => {
    if (!isEditMode) return;
    const spot = spots.find(s => s.id === spotId);
    if (!spot) return;
    const newChecked = !spot.checked;
    setSpots(prev => prev.map(s => s.id === spotId ? { ...s, checked: newChecked } : s));
    try {
      await updateSpot(tripId, spotId, { checked: newChecked });
    } catch (e) {
      // revert on failure
      setSpots(prev => prev.map(s => s.id === spotId ? { ...s, checked: !newChecked } : s));
    }
  }, [isEditMode, spots, tripId]);

  // Edit mode: update time
  const handleTimeEdit = useCallback(async (spotId: string, time: string) => {
    if (!isEditMode) return;
    setSpots(prev => prev.map(s => s.id === spotId ? { ...s, timeOverride: time } : s));
    try {
      await updateSpot(tripId, spotId, { timeOverride: time });
    } catch (e) {
      console.error('Failed to update time', e);
    }
  }, [isEditMode, tripId]);

  // ─── Loading / Error ───
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Loading trip...</p>
        </div>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md px-6">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-50 rounded-full flex items-center justify-center">
            <MapPin size={24} className="text-red-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Cannot access trip</h2>
          <p className="text-sm text-gray-500">{error || 'Trip not found'}</p>
        </div>
      </div>
    );
  }

  // ─── Area guesser ───
  function guessArea(daySpots: Spot[]): string {
    if (daySpots.length === 0) return '';
    const areas = daySpots
      .map(s => s.address || '').filter(Boolean)
      .map(addr => {
        const parts = addr.split(',').map(p => p.trim());
        return parts.length >= 3 ? parts[parts.length - 3] : parts.length >= 2 ? parts[parts.length - 2] : parts[0];
      }).filter(Boolean);
    const freq: Record<string, number> = {};
    areas.forEach(a => { freq[a] = (freq[a] || 0) + 1; });
    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
    if (sorted.length === 0) return '';
    if (sorted.length === 1) return sorted[0][0];
    return `${sorted[0][0]}, ${sorted[1][0]}`;
  }

  // ─── Overview mode ───
  if (selectedDay === null) {
    const startDate = new Date(trip.startDate);
    const checkedCount = spots.filter(s => s.checked).length;
    const totalDistance = calculateTotalDistance(spots);

    const days = Array.from({ length: totalDays }, (_, i) => {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dayGroups = groups.filter(g => g.assignedDay === i);
      const daySpotIds = dayGroups.flatMap(g => g.spotIds);
      const daySpots = spots.filter(s => daySpotIds.includes(s.id));
      const dayChecked = daySpots.filter(s => s.checked).length;
      const meta = dayMetas.find(m => m.dayIdx === i);
      const area = meta?.area || guessArea(daySpots);
      const description = meta?.description || '';
      return { date, dayIdx: i, spots: daySpots, checked: dayChecked, groups: dayGroups, area, description };
    });

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-4 py-4">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-500 font-medium mb-1">Shared Trip Plan</p>
                <h1 className="text-xl font-bold text-gray-900">{trip.title}</h1>
                <p className="text-sm text-gray-500">{trip.country} · {trip.startDate} — {trip.endDate}</p>
              </div>
              {isEditMode && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-xl text-xs font-semibold border border-orange-200">
                  <Pencil size={12} /> Edit Mode
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {days.map(day => {
              const progress = day.spots.length > 0 ? (day.checked / day.spots.length) * 100 : 0;
              const dayOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day.date.getDay()];
              return (
                <div
                  key={day.dayIdx}
                  className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-all cursor-pointer"
                  onClick={() => { setSelectedDay(day.dayIdx); }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <span className="text-sm font-bold text-gray-900">Day {day.dayIdx + 1}</span>
                      <span className="text-xs text-gray-400 ml-2">{dayOfWeek} {day.date.getDate()}/{day.date.getMonth() + 1}</span>
                    </div>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {day.spots.length} spots
                    </span>
                  </div>
                  {day.area && (
                    <p className="text-xs text-blue-500 flex items-center gap-1 mb-2">
                      <MapPinned size={11} /> {day.area}
                    </p>
                  )}
                  {day.description && (
                    <p className="text-xs text-gray-400 mb-2 line-clamp-2">{day.description}</p>
                  )}
                  <div className="w-full h-1.5 bg-gray-100 rounded-full mb-3 overflow-hidden">
                    <div className="h-full bg-green-400 rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {day.groups.map(g => (
                      <span key={g.id} className="text-xs text-white px-2 py-0.5 rounded-full" style={{ background: g.color }}>
                        {g.label}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Trip Summary */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl border border-blue-100 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Trip Summary</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: <Calendar size={18} />, label: 'Days', value: totalDays, bg: 'bg-blue-100', text: 'text-blue-600' },
                { icon: <MapPin size={18} />, label: 'Places', value: spots.length, bg: 'bg-purple-100', text: 'text-purple-600' },
                { icon: <Check size={18} />, label: 'Visited', value: `${checkedCount}/${spots.length}`, bg: 'bg-green-100', text: 'text-green-600' },
                { icon: <Route size={18} />, label: 'Distance', value: `${totalDistance.toFixed(1)} km`, bg: 'bg-orange-100', text: 'text-orange-600' },
              ].map(stat => (
                <div key={stat.label} className="bg-white/80 rounded-xl p-3 text-center">
                  <div className={`w-8 h-8 mx-auto rounded-lg ${stat.bg} ${stat.text} flex items-center justify-center mb-2`}>{stat.icon}</div>
                  <p className="text-lg font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Day detail view ───
  const daySpots = getDaySpots(selectedDay);
  const dayColor = getDayColor(selectedDay);
  const dayDate = new Date(trip.startDate);
  dayDate.setDate(dayDate.getDate() + selectedDay);
  const meta = dayMetas.find(m => m.dayIdx === selectedDay);
  const area = meta?.area || guessArea(daySpots);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Day header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex-shrink-0">
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
            {area && (
              <p className="hidden sm:flex text-xs text-blue-500 items-center gap-1">
                <MapPinned size={12} /> {area}
              </p>
            )}
            {isEditMode && (
              <span className="flex items-center gap-1 px-2 py-1 bg-orange-50 text-orange-600 rounded-lg text-xs font-semibold border border-orange-200">
                <Pencil size={11} /> Editing
              </span>
            )}
          </div>
        </div>
      </div>
      {/* Content */}
      <div className="flex-1 max-w-6xl w-full mx-auto px-4 py-4 flex gap-4 overflow-hidden" style={{ height: 'calc(100vh - 7rem)' }}>

        {/* Spot list — hidden on mobile when map tab is active */}
        <div className={`w-full md:w-96 md:flex-shrink-0 overflow-y-auto scrollbar-thin ${mobileTab === 'map' ? 'hidden md:block' : 'block'}`}>
          {daySpots.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 text-sm">No spots assigned to this day.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {daySpots.map((spot, i) => (
                <div
                  key={spot.id}
                  onClick={() => { setSelectedSpotId(spot.id);  }}
                  className={`bg-white rounded-xl border p-3 cursor-pointer transition-all ${
                    selectedSpotId === spot.id ? 'border-blue-300 shadow-md' : 'border-gray-100 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {/* Number badge */}
                        <span
                          className="w-5 h-5 rounded-full text-white text-xs font-bold flex items-center justify-center flex-shrink-0"
                          style={{ background: dayColor }}
                        >
                          {i + 1}
                        </span>
                        <span className="text-sm">{SPOT_TYPE_CONFIG[spot.type]?.emoji || '📍'}</span>
                        <span className="font-medium text-sm text-gray-900 truncate">{spot.name}</span>
                        {spot.checked && <Check size={14} className="text-green-500 flex-shrink-0" />}
                      </div>
                      {/* Time — editable in edit mode */}
                      {isEditMode ? (
                        <div className="flex items-center gap-1 mb-1" onClick={e => e.stopPropagation()}>
                          <Clock size={10} className="text-gray-400" />
                          <input
                            type="time"
                            defaultValue={spot.timeOverride || ''}
                            onBlur={e => handleTimeEdit(spot.id, e.target.value)}
                            className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-300"
                          />
                        </div>
                      ) : spot.timeOverride ? (
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock size={10} /> {spot.timeOverride}
                        </p>
                      ) : null}
                      {spot.address && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{spot.address}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {/* Check toggle in edit mode */}
                      {isEditMode && (
                        <button
                          onClick={e => { e.stopPropagation(); handleToggleCheck(spot.id); }}
                          className={`p-1.5 rounded-lg transition-colors ${
                            spot.checked
                              ? 'bg-green-100 text-green-600 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                          }`}
                          title={spot.checked ? 'Mark unvisited' : 'Mark visited'}
                        >
                          <Check size={14} />
                        </button>
                      )}
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${spot.lat},${spot.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-300 hover:text-blue-500 transition-colors"
                      >
                        <ExternalLink size={14} />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Map — hidden on mobile when list tab is active */}
        <div className={`flex-1 rounded-xl overflow-hidden border border-gray-200 min-h-[300px] ${mobileTab === 'list' ? 'hidden md:block' : 'block'}`}>
          <PlanMap
            spots={daySpots}
            dayColor={dayColor}
            selectedSpotId={selectedSpotId}
            onSpotSelect={id => { setSelectedSpotId(id); }}
          />
        </div>
      </div>
    </div>
  );
}
