'use client';

import { useState, useEffect, useCallback } from 'react';
import { Trip } from '@/types';
import { getTrip, getUserTrips, createTrip, updateTrip, deleteTrip } from '@/lib/firestore';

export function useTrip(tripId?: string) {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(!!tripId);

  useEffect(() => {
    if (!tripId) return;
    setLoading(true);
    getTrip(tripId).then(t => {
      setTrip(t);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [tripId]);

  const refresh = useCallback(async () => {
    if (!tripId) return;
    const t = await getTrip(tripId);
    setTrip(t);
  }, [tripId]);

  return { trip, loading, refresh };
}

export function useUserTrips(uid?: string) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    const t = await getUserTrips(uid);
    setTrips(t);
    setLoading(false);
  }, [uid]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { trips, loading, refresh, createTrip, updateTrip, deleteTrip };
}
