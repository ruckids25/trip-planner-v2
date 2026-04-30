import {
  collection, doc, addDoc, getDoc, getDocs, updateDoc, deleteDoc,
  query, where, orderBy, serverTimestamp, writeBatch,
  onSnapshot, Unsubscribe, setDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { Trip, Spot, Group } from '@/types';

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
  const q = query(
    collection(db, 'trips'),
    where('ownerId', '==', uid),
    orderBy('updatedAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Trip));
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
    ...spot,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function addSpotsBatch(tripId: string, spots: Omit<Spot, 'id' | 'createdAt'>[]): Promise<void> {
  const batch = writeBatch(db);
  spots.forEach(spot => {
    const ref = doc(collection(db, 'trips', tripId, 'spots'));
    batch.set(ref, { ...spot, createdAt: serverTimestamp() });
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
