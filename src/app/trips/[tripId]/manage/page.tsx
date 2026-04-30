'use client';

import { useState, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import GroupPanel from '@/components/manage/GroupPanel';
import GroupMap from '@/components/manage/GroupMap';
import { useSpots } from '@/hooks/useSpots';
import { useGroups } from '@/hooks/useGroups';
import { useTrip } from '@/hooks/useTrip';
import { useToast } from '@/components/ui/Toast';
import { clusterSpots } from '@/lib/clustering';
import { Group, GROUP_COLORS } from '@/types';
import { Wand2, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';

export default function ManagePage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = use(params);
  const { spots } = useSpots(tripId);
  const { groups, save: saveGroups } = useGroups(tripId);
  const { trip } = useTrip(tripId);
  const { toast } = useToast();
  const router = useRouter();

  const [selectedSpotId, setSelectedSpotId] = useState<string>();
  const [clustering, setClustering] = useState(false);

  const handleAutoGroup = useCallback(async () => {
    if (spots.length === 0) {
      toast('No spots to group. Upload some images first!', 'info');
      return;
    }
    setClustering(true);
    try {
      const newGroups = clusterSpots(spots);
      await saveGroups(newGroups);
      toast(`Created ${newGroups.length} groups!`, 'success');
    } catch {
      toast('Clustering failed', 'error');
    }
    setClustering(false);
  }, [spots, saveGroups, toast]);

  const handleSpotMove = useCallback((spotId: string, fromGroupId: string, toGroupId: string) => {
    const updated = groups.map(g => {
      if (g.id === fromGroupId) return { ...g, spotIds: g.spotIds.filter(id => id !== spotId) };
      if (g.id === toGroupId) return { ...g, spotIds: [...g.spotIds, spotId] };
      return g;
    });
    saveGroups(updated);
  }, [groups, saveGroups]);

  const handleGroupEdit = useCallback((groupId: string, data: { label?: string; color?: string }) => {
    const updated = groups.map(g => g.id === groupId ? { ...g, ...data } : g);
    saveGroups(updated);
  }, [groups, saveGroups]);

  const handleGroupDelete = useCallback((groupId: string) => {
    const updated = groups.filter(g => g.id !== groupId);
    saveGroups(updated);
    toast('Group deleted', 'info');
  }, [groups, saveGroups, toast]);

  const handleGroupCreate = useCallback(() => {
    const newGroup: Group = {
      id: `group-${Date.now()}`,
      label: `New Group`,
      color: GROUP_COLORS[groups.length % GROUP_COLORS.length],
      center: { lat: 0, lng: 0 },
      spotIds: [],
    };
    saveGroups([...groups, newGroup]);
  }, [groups, saveGroups]);

  return (
    <div className="h-[calc(100vh-8rem)]">
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Manage Groups</h2>
            <p className="text-sm text-gray-500">Auto-group spots by location, then drag to adjust</p>
          </div>
          <button
            onClick={handleAutoGroup}
            disabled={clustering || spots.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition-colors font-medium text-sm disabled:opacity-50"
          >
            {clustering ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
            Auto Group
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 flex gap-4 h-[calc(100%-5rem)]">
        {/* Sidebar */}
        <div className="w-80 flex-shrink-0">
          <GroupPanel
            groups={groups}
            spots={spots}
            onSpotMove={handleSpotMove}
            onGroupEdit={handleGroupEdit}
            onGroupDelete={handleGroupDelete}
            onGroupCreate={handleGroupCreate}
            selectedSpotId={selectedSpotId}
            onSpotSelect={setSelectedSpotId}
          />
        </div>

        {/* Map */}
        <div className="flex-1 rounded-xl overflow-hidden border border-gray-200">
          <GroupMap
            groups={groups}
            spots={spots}
            selectedSpotId={selectedSpotId}
            onSpotSelect={setSelectedSpotId}
          />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between">
        <button
          onClick={() => router.push(`/trips/${tripId}/upload`)}
          className="flex items-center gap-2 px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-xl transition-colors text-sm"
        >
          <ArrowLeft size={16} /> Back to Upload
        </button>
        <button
          onClick={() => router.push(`/trips/${tripId}/calendar`)}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors font-medium text-sm"
        >
          Next: Calendar <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
