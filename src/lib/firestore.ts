import {
  collection, doc, addDoc, getDoc, getDocs, updateDoc, deleteDoc,
  query, where, orderBy, serverTimestamp, writeBatch,
  onSnapshot, Unsubscribe, setDoc, Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { Trip, Spot, Group, ApiUsageLog } from '@/types';

// ═══════════════════════════════════════
// TRIPS
// ═══════════════════════════════════════

export async function createTrip(data: {
  title: string;
  country: string;
  startDate: string;
  endDate: string;
  ownerId: string;
}): Promise<string> {
  const ref = await addDoc(collection(db, 'trips'), {
    ...data,
    collaborators: [],
    status: 'uploading',
    coverImage: '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}
export async function getTrip(tripId: string): Promise<Trip | null> {
  const snap = await getDoc(doc(db, 'trips', tripId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Trip;
}

export async function getUserTrips(uid: string): Promise<Trip[]> {
  try {
    const q = query(
      collection(db, 'trips'),
      where('ownerId', '==', uid),
      orderBy('updatedAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Trip));
  } catch {
    // Fallback: query without orderBy (works without composite index)
    const q = query(
      collection(db, 'trips'),
      where('ownerId', '==', uid)
    );
    const snap = await getDocs(q);
    const trips = snap.docs.map(d => ({ id: d.id, ...d.data() } as Trip));
    // Sort client-side
    return trips.sort((a, b) => {
      const aTime = (a as any).updatedAt?.toMillis?.() || 0;
      const bTime = (b as any).updatedAt?.toMillis?.() || 0;
      return bTime - aTime;
    });
  }
}
export async function updateTrip(tripId: string, data: Partial<Trip>): Promise<void> {
  await updateDoc(doc(db, 'trips', tripId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteTrip(tripId: string): Promise<void> {
  // Delete subcollections first
  const spotsSnap = await getDocs(collection(db, 'trips', tripId, 'spots'));
  const groupsSnap = await getDocs(collection(db, 'trips', tripId, 'groups'));
  const batch = writeBatch(db);
  spotsSnap.docs.forEach(d => batch.delete(d.ref));
  groupsSnap.docs.forEach(d => batch.delete(d.ref));
  batch.delete(doc(db, 'trips', tripId));
  await batch.commit();
}

// ═══════════════════════════════════════
// SPOTS
// ═══════════════════════════════════════

export async function addSpot(tripId: string, spot: Omit<Spot, 'id' | 'createdAt'>): Promise<string> {
  const ref = await addDoc(collection(db, 'trips', tripId, 'spots'), {
    ...cleanData(spot),
    createdAt: serverTimestamp(),
  });
  return ref.id;
}
// Strip undefined values (Firestore rejects them)
function cleanData<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as T;
}

export async function addSpotsBatch(tripId: string, spots: Omit<Spot, 'id' | 'createdAt'>[]): Promise<void> {
  const batch = writeBatch(db);
  spots.forEach(spot => {
    const ref = doc(collection(db, 'trips', tripId, 'spots'));
    batch.set(ref, { ...cleanData(spot), createdAt: serverTimestamp() });
  });
  await batch.commit();
}

export async function getSpots(tripId: string): Promise<Spot[]> {
  const snap = await getDocs(collection(db, 'trips', tripId, 'spots'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Spot));
}

export async function updateSpot(tripId: string, spotId: string, data: Partial<Spot>): Promise<void> {
  await updateDoc(doc(db, 'trips', tripId, 'spots', spotId), data);
}

export async function deleteSpot(tripId: string, spotId: string): Promise<void> {
  await deleteDoc(doc(db, 'trips', tripId, 'spots', spotId));
}
export function subscribeSpots(tripId: string, onChange: (spots: Spot[]) => void): Unsubscribe {
  return onSnapshot(collection(db, 'trips', tripId, 'spots'), snap => {
    onChange(snap.docs.map(d => ({ id: d.id, ...d.data() } as Spot)));
  });
}

// ═══════════════════════════════════════
// GROUPS
// ═══════════════════════════════════════

export async function saveGroups(tripId: string, groups: Group[]): Promise<void> {
  const batch = writeBatch(db);
  // Delete existing groups first
  const existing = await getDocs(collection(db, 'trips', tripId, 'groups'));
  existing.docs.forEach(d => batch.delete(d.ref));
  // Add new groups
  groups.forEach(group => {
    const ref = doc(collection(db, 'trips', tripId, 'groups'));
    batch.set(ref, { ...group, id: ref.id });
  });
  await batch.commit();
}

export async function getGroups(tripId: string): Promise<Group[]> {
  const snap = await getDocs(collection(db, 'trips', tripId, 'groups'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Group));
}

export function subscribeGroups(tripId: string, onChange: (groups: Group[]) => void): Unsubscribe {
  return onSnapshot(collection(db, 'trips', tripId, 'groups'), snap => {
    onChange(snap.docs.map(d => ({ id: d.id, ...d.data() } as Group)));
  });
}
// ═══════════════════════════════════════
// USER
// ═══════════════════════════════════════

export async function saveUser(uid: string, data: {
  displayName: string;
  email: string;
  photoURL: string;
}): Promise<void> {
  await setDoc(doc(db, 'users', uid), {
    ...data,
    uid,
    lastLoginAt: serverTimestamp(),
  }, { merge: true });
}

// ═══════════════════════════════════════
// API USAGE LOGGING
// ═══════════════════════════════════════

const API_COSTS: Record<string, number> = {
  vision: 0.0015,   // ~$1.50 per 1000 requests
  places: 0.017,    // ~$17 per 1000 requests
};

export async function logApiUsage(data: {
  userId: string;
  userEmail: string;
  endpoint: 'vision' | 'places';
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await addDoc(collection(db, 'apiUsage'), {
      ...data,
      estimatedCost: API_COSTS[data.endpoint] || 0,
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    console.error('Failed to log API usage:', err);
    // Don't throw — logging should not break the main flow
  }
}
// ═══════════════════════════════════════
// ADMIN QUERIES
// ═══════════════════════════════════════

export async function getAllUsers(): Promise<Record<string, unknown>[]> {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getAllTrips(): Promise<Trip[]> {
  const snap = await getDocs(collection(db, 'trips'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Trip));
}

export async function getAllApiUsage(): Promise<ApiUsageLog[]> {
  const q = query(
    collection(db, 'apiUsage'),
    orderBy('timestamp', 'desc')
  );
  try {
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as ApiUsageLog));
  } catch {
    // Fallback without orderBy if index not ready
    const snap = await getDocs(collection(db, 'apiUsage'));
    const logs = snap.docs.map(d => ({ id: d.id, ...d.data() } as ApiUsageLog));
    return logs.sort((a, b) => {
      const aTime = a.timestamp?.toMillis?.() || 0;
      const bTime = b.timestamp?.toMillis?.() || 0;
      return bTime - aTime;
    });
  }
}

export async function getSpotCountForTrip(tripId: string): Promise<number> {
  const snap = await getDocs(collection(db, 'trips', tripId, 'spots'));
  return snap.size;
}