'use client';

import { use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import CalendarGrid from '@/components/calendar/CalendarGrid';
import GroupChip from '@/components/calendar/GroupChip';
import { useTrip } from '@/hooks/useTrip';
import { useSpots } from '@/hooks/useSpots';
import { useGroups } from '@/hooks/useGroups';
import { useToast } from '@/components/ui/Toast';
import { ArrowLeft, ArrowRight, Wand2 } from 'lucide-react';

export default function CalendarPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = use(params);
  const { trip } = useTrip(tripId);
  const { spots } = useSpots(tripId);
  const { groups, save: saveGroups } = useGroups(tripId);
  const { toast } = useToast();
  const router = useRouter();

  const handleDropGroup = useCallback((groupId: string, dayIdx: number) => {
    const updated = groups.map(g =>
      g.id === groupId ? { ...g, assignedDay: dayIdx } : g
    );
    saveGroups(updated);
    toast('Group assigned to day!', 'success');
  }, [groups, saveGroups, toast]);

  const handleRemoveGroup = useCallback((groupId: string, dayIdx: number) => {
    const updated = groups.map(g =>
      g.id === groupId && g.assignedDay === dayIdx ? { ...g, assignedDay: undefined } : g
    );
    saveGroups(updated);
  }, [groups, saveGroups]);

  const handleAutoAssign = useCallback(() => {
    if (groups.length === 0 || !trip) return;
    const startDate = new Date(trip.startDate);
    const endDate = new Date(trip.endDate);
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000) + 1;

    const unassigned = groups.filter(g => g.assignedDay === undefined);
    if (unassigned.length === 0) {
      toast('All groups are already assigned', 'info');
      return;
    }

    let nextDay = 0;
    const updated = groups.map(g => {
      if (g.assignedDay !== undefined) return g;
      const assigned = { ...g, assignedDay: nextDay % totalDays };
      nextDay++;
      return assigned;
    });

    saveGroups(updated);
    toast('Groups auto-assigned to days!', 'success');
  }, [groups, trip, saveGroups, toast]);

  const unassignedGroups = groups.filter(g => g.assignedDay === undefined);

  if (!trip) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Assign to Calendar</h2>
          <p className="text-sm text-gray-500">Drag groups onto calendar days to plan your itinerary</p>
        </div>
        <button
          onClick={handleAutoAssign}
          className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition-colors font-medium text-sm"
        >
          <Wand2 size={16} /> Auto Assign
        </button>
      </div>

      {/* Unassigned groups */}
      {unassignedGroups.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-600">Drag these groups to a day:</p>
          <div className="flex flex-wrap gap-2">
            {unassignedGroups.map(group => (
              <GroupChip
                key={group.id}
                group={group}
                spotCount={group.spotIds.length}
                assigned={false}
              />
            ))}
          </div>
        </div>
      )}

      <CalendarGrid
        trip={trip}
        groups={groups}
        onDropGroup={handleDropGroup}
        onRemoveGroup={handleRemoveGroup}
      />

      <div className="flex justify-between pt-4 border-t border-gray-100">
        <button
          onClick={() => router.push(`/trips/${tripId}/manage`)}
          className="flex items-center gap-2 px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-xl transition-colors text-sm"
        >
          <ArrowLeft size={16} /> Back to Manage
        </button>
        <button
          onClick={() => router.push(`/trips/${tripId}/plan`)}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors font-medium text-sm"
        >
          Next: View Plan <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
