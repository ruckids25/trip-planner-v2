'use client';

import { Trip, Spot, Group, SPOT_TYPE_CONFIG } from '@/types';
import { calculateTotalDistance } from '@/lib/route-optimizer';
import { MapPin, Check, Route, Calendar } from 'lucide-react';

interface OverviewProps {
  trip: Trip;
  spots: Spot[];
  groups: Group[];
  onDaySelect: (dayIdx: number) => void;
}

export default function Overview({ trip, spots, groups, onDaySelect }: OverviewProps) {
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

    return { date, dayIdx: i, spots: daySpots, checked: dayChecked, groups: dayGroups };
  });

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: <Calendar size={18} />, label: 'Days', value: totalDays, color: 'blue' },
          { icon: <MapPin size={18} />, label: 'Places', value: spots.length, color: 'purple' },
          { icon: <Check size={18} />, label: 'Visited', value: `${checkedCount}/${spots.length}`, color: 'green' },
          { icon: <Route size={18} />, label: 'Distance', value: `${totalDistance.toFixed(1)} km`, color: 'orange' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-100 p-4">
            <div className={`text-${stat.color}-500 mb-2`}>{stat.icon}</div>
            <p className="text-xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-xs text-gray-500">{stat.label}</p>
          </div>
        ))}
      </div>

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
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-sm font-bold text-gray-900">Day {day.dayIdx + 1}</span>
                  <span className="text-xs text-gray-400 ml-2">{dayOfWeek} {day.date.getDate()}/{day.date.getMonth() + 1}</span>
                </div>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                  {day.checked}/{day.spots.length}
                </span>
              </div>

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
    </div>
  );
}
