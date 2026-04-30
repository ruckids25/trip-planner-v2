'use client';

import { useEffect, useRef, useCallback } from 'react';
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface UseSyncOptions<T> {
  docPath: string;
  onRemoteChange: (data: T) => void;
  enabled?: boolean;
}

export function useRealtimeSync<T>({ docPath, onRemoteChange, enabled = true }: UseSyncOptions<T>) {
  const skipNextRemote = useRef(false);

  useEffect(() => {
    if (!enabled || !docPath) return;

    const unsub = onSnapshot(doc(db, docPath), (snap) => {
      if (!snap.exists()) return;
      if (skipNextRemote.current) {
        skipNextRemote.current = false;
        return;
      }
      onRemoteChange(snap.data() as T);
    }, (error) => {
      console.error('Sync error:', error);
    });

    return unsub;
  }, [docPath, onRemoteChange, enabled]);

  const saveLocal = useCallback(async (data: Partial<T>) => {
    skipNextRemote.current = true;
    try {
      await updateDoc(doc(db, docPath), {
        ...data,
        updatedAt: serverTimestamp(),
      } as Record<string, unknown>);
    } catch (error) {
      skipNextRemote.current = false;
      console.error('Save error:', error);
    }
  }, [docPath]);

  return { saveLocal };
}
