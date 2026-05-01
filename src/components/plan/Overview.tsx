'use client';

import { Trip, Spot, Group, DayMeta, SPOT_TYPE_CONFIG } from '@/types';
import { calculateTotalDistance } from '@/lib/route-optimizer';
import { MapPin, Check, Route, Calendar, MapPinned } from 'lucide-react';

interface OverviewProps {
  trip: Trip;
  spots: Spot[];
  groups: Group[];
  dayMetas: DayMeta[];
  onDaySelect: (dayIdx: number) => void;
}

function guessArea(daySpots: Spot[]): string {
  if (daySpots.length === 0) return '';
  // Extract area names from addresses
  const areas = daySpots
    .map(s => s.address || '')
    .filter(Boolean)
    .map(addr => {
      // Try to extract district/ward from address (works for Japanese + Thai addresses)
      const parts = addr.split(',').map(p => p.trim());
      // Return 2nd or 3rd part which is usually the district/area
      return parts.length >= 3 ? parts[parts.length - 3] : parts.length >= 2 ? parts[parts.length - 2] : parts[0];
    })
    .filter(Boolean);

  // Find most common area
  const freq: Record<string, number> = {};
  areas.forEach(a => { freq[a] = (freq[a] || 0) + 1; });
  const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);

  // Return top 1-2 areas
  if (sorted.length === 0) return '';
  if (sorted.length === 1) return sorted[0][0];
  return `${sorted[0][0]}, ${sorted[1][0]}`;
}

export default function Overview({ trip, spots, groups, dayMetas, onDaySelect }: OverviewProps) {
  const startDate = new Date(trip.startDate);
  const endDate = new Date(trip.endDate);
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000) + 1;

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
    <div className="space-y-6">
      {/* Day cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {days.map(day => {
          const progress = day.spots.length > 0 ? (day.checked / day.spots.length) * 100 : 0;
          const dayOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day.date.getDay()];

          return (
            <div
              key={day.dayIdx}
              className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-all cursor-pointer"
              onClick={() => onDaySelect(day.dayIdx)}
            >
              <div className="flex items-center justify-between mb-1">
                <div>
                  <span className="text-sm font-bold text-gray-900">Day {day.dayIdx + 1}</span>
                  <span className="text-xs text-gray-400 ml-2">{dayOfWeek} {day.date.getDate()}/{day.date.getMonth() + 1}</span>
                </div>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                  {day.checked}/{day.spots.length}
                </span>
              </div>

              {/* Area label */}
              {day.area && (
                <p className="text-xs text-blue-500 flex items-center gap-1 mb-2">
                  <MapPinned size={11} /> {day.area}
                </p>
              )}

              {/* Description */}
              {day.description && (
                <p className="text-xs text-gray-400 mb-2 line-clamp-2">{day.description}</p>
              )}

              {/* Progress bar */}
              <div className="w-full h-1.5 bg-gray-100 rounded-full mb-3 overflow-hidden">
                <div className="h-full bg-green-400 rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>

              {/* Group chips */}
              <div className="flex flex-wrap gap-1">
                {day.groups.map(g => (
                  <span
                    key={g.id}
                    className="text-xs text-white px-2 py-0.5 rounded-full"
                    style={{ background: g.color }}
                  >
                    {g.label}
                  </span>
                ))}
                {day.groups.length === 0 && (
                  <span className="text-xs text-gray-400">No groups assigned</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Trip Summary — below last day */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl border border-blue-100 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Trip Summary</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: <Calendar size={18} />, label: 'Days', value: totalDays, bgColor: 'bg-blue-100', textColor: 'text-blue-600' },
            { icon: <MapPin size={18} />, label: 'Places', value: spots.length, bgColor: 'bg-purple-100', textColor: 'text-purple-600' },
            { icon: <Check size={18} />, label: 'Visited', value: `${checkedCount}/${spots.length}`, bgColor: 'bg-green-100', textColor: 'text-green-600' },
            { icon: <Route size={18} />, label: 'Distance', value: `${totalDistance.toFixed(1)} km`, bgColor: 'bg-orange-100', textColor: 'text-orange-600' },
          ].map(stat => (
            <div key={stat.label} className="bg-white/80 rounded-xl p-3 text-center">
              <div className={`w-8 h-8 mx-auto rounded-lg ${stat.bgColor} ${stat.textColor} flex items-center justify-center mb-2`}>{stat.icon}</div>
              <p className="text-lg font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
