'use client';

import { useState, useEffect, useCallback } from 'react';
import { DayMeta } from '@/types';
import { getDayMetas, saveDayMeta, subscribeDayMetas } from '@/lib/firestore';

export function useDayMeta(tripId: string) {
  const [dayMetas, setDayMetas] = useState<DayMeta[]>([]);

  useEffect(() => {
    const unsub = subscribeDayMetas(tripId, setDayMetas);
    return () => unsub();
  }, [tripId]);

  const getMeta = useCallback((dayIdx: number): DayMeta | undefined => {
    return dayMetas.find(m => m.dayIdx === dayIdx);
  }, [dayMetas]);

  const updateMeta = useCallback(async (dayIdx: number, data: {
    area?: string; description?: string;
    hotelName?: string; hotelLat?: number; hotelLng?: number;
  }) => {
    await saveDayMeta(tripId, dayIdx, data);
  }, [tripId]);

  return { dayMetas, getMeta, updateMeta };
}
