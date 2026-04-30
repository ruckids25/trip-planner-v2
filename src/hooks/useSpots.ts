'use client';

import { useState, useEffect, useCallback } from 'react';
import { Spot } from '@/types';
import { getSpots, addSpot, addSpotsBatch, updateSpot, deleteSpot, subscribeSpots } from '@/lib/firestore';

export function useSpots(tripId: string) {
  const [spots, setSpots] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tripId) return;
    setLoading(true);
    const unsub = subscribeSpots(tripId, (s) => {
      setSpots(s);
      setLoading(false);
    });
    return unsub;
  }, [tripId]);

  const add = useCallback(async (spot: Omit<Spot, 'id' | 'createdAt'>) => {
    return addSpot(tripId, spot);
  }, [tripId]);

  const addBatch = useCallback(async (spotsList: Omit<Spot, 'id' | 'createdAt'>[]) => {
    return addSpotsBatch(tripId, spotsList);
  }, [tripId]);

  const update = useCallback(async (spotId: string, data: Partial<Spot>) => {
    return updateSpot(tripId, spotId, data);
  }, [tripId]);

  const remove = useCallback(async (spotId: string) => {
    return deleteSpot(tripId, spotId);
  }, [tripId]);

  return { spots, loading, add, addBatch, update, remove };
}
