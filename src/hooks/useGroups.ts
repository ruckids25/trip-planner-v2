'use client';

import { useState, useEffect, useCallback } from 'react';
import { Group } from '@/types';
import { getGroups, saveGroups, subscribeGroups } from '@/lib/firestore';

export function useGroups(tripId: string) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tripId) return;
    setLoading(true);
    const unsub = subscribeGroups(tripId, (g) => {
      setGroups(g);
      setLoading(false);
    });
    return unsub;
  }, [tripId]);

  const save = useCallback(async (newGroups: Group[]) => {
    setGroups(newGroups);
    await saveGroups(tripId, newGroups);
  }, [tripId]);

  return { groups, loading, save, setGroups };
}
