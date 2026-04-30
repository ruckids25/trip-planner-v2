'use client';

import { Group, Trip } from '@/types';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarGridProps {
  trip: Trip;
  groups: Group[];
  onDropGroup: (groupId: string, dayIdx: number) => void;
  onRemoveGroup: (groupId: string, dayIdx: number) => void;
}

export default function CalendarGrid({ trip, groups, onDropGroup, onRemoveGroup }: CalendarGridProps) {
  const startDate = new Date(trip.startDate);
  const endDate = new Date(trip.endDate);
  const days: { date: Date; dayIdx: number }[] = [];

  const current = new Date(startDate);
  let idx = 0;
  while (current <= endDate) {
    days.push({ date: new Date(current), dayIdx: idx });
    current.setDate(current.getDate() + 1);
    idx++;
  }

  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getAssignedGroups = (dayIdx: number) =>
    groups.filter(g => g.assignedDay === dayIdx);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-7 gap-1">
        {weekdays.map(d => (
          <div key={d} className="text-xs font-medium text-gray-400 text-center py-2">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {/* Empty cells for offset */}
        {Array.from({ length: startDate.getDay() }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {days.map(({ date, dayIdx }) => {
          const assigned = getAssignedGroups(dayIdx);
          const isToday = new Date().toDateString() === date.toDateString();

          return (
            <div
              key={dayIdx}
              className={`min-h-[100px] rounded-xl border-2 p-2 transition-all ${
                assigned.length > 0
                  ? 'border-blue-200 bg-blue-50/50'
                  : 'border-dashed border-gray-200 hover:border-blue-300 hover:bg-blue-50/30'
              }`}
              onDragOver={e => e.preventDefault()}
              onDrop={(e) => {
                const groupId = e.dataTransfer.getData('groupId');
                if (groupId) onDropGroup(groupId, dayIdx);
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-medium ${isToday ? 'text-blue-600' : 'text-gray-500'}`}>
                  {date.getDate()}
                </span>
                <span className="text-xs text-gray-400">
                  Day {dayIdx + 1}
                </span>
              </div>

              <div className="space-y-1">
                {assigned.map(group => (
                  <div
                    key={group.id}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-white text-xs font-medium cursor-pointer hover:opacity-80"
                    style={{ background: group.color }}
                    onClick={() => onRemoveGroup(group.id, dayIdx)}
                    title="Click to remove"
                  >
                    <div className="w-2 h-2 rounded-full bg-white/40" />
                    <span className="truncate">{group.label}</span>
                    <span className="ml-auto text-white/70">{group.spotIds.length}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
