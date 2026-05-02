import { Timestamp } from 'firebase/firestore';

export interface User {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  createdAt: Timestamp;
  lastLoginAt: Timestamp;
}

export type SpotType =
  | 'temple' | 'shrine' | 'food' | 'cafe'
  | 'shopping' | 'park' | 'museum'
  | 'attraction' | 'transport' | 'hotel' | 'other';

export interface Trip {
  id: string;
  title: string;
  country: string;
  coverImage?: string;
  startDate: string;
  endDate: string;
  ownerId: string;
  collaborators: string[];
  status: 'uploading' | 'managing' | 'planning' | 'ready';
  isShared?: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Spot {
  id: string;
  name: string;
  nameLocal?: string;
  lat: number;
  lng: number;
  type: SpotType;
  address?: string;
  hours?: string;
  rating?: number;
  photoRef?: string;
  note?: string;
  source: 'ocr' | 'search' | 'manual';
  groupId?: string;
  dayIdx?: number;
  sortOrder?: number;
  timeOverride?: string;
  checked?: boolean;
  createdAt: Timestamp;
}

export interface Group {
  id: string;
  label: string;
  color: string;
  center: { lat: number; lng: number };
  spotIds: string[];
  assignedDay?: number;
  sortOrder?: number;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export const SPOT_TYPE_CONFIG: Record<SpotType, { label: string; emoji: string; color: string }> = {
  temple: { label: 'วัด', emoji: '⛩️', color: '#E74C3C' },
  shrine: { label: 'ศาลเจ้า', emoji: '🏯', color: '#C0392B' },
  food: { label: 'อาหาร', emoji: '🍜', color: '#E67E22' },
  cafe: { label: 'คาเฟ่', emoji: '☕', color: '#8B4513' },
  shopping: { label: 'ช้อปปิ้ง', emoji: '🛍️', color: '#9B59B6' },
  park: { label: 'สวน', emoji: '🌳', color: '#27AE60' },
  museum: { label: 'พิพิธภัณฑ์', emoji: '🏛️', color: '#2980B9' },
  attraction: { label: 'สถานที่เที่ยว', emoji: '📸', color: '#F39C12' },
  transport: { label: 'การเดินทาง', emoji: '🚃', color: '#1ABC9C' },
  hotel: { label: 'โรงแรม', emoji: '🏨', color: '#34495E' },
  other: { label: 'อื่นๆ', emoji: '📍', color: '#7F8C8D' },
};

export interface DayMeta {
  id: string;
  dayIdx: number;
  area: string;
  description: string;
  hotelName?: string;
  hotelLat?: number;
  hotelLng?: number;
}

export interface ApiUsageLog {
  id: string;
  userId: string;
  userEmail: string;
  endpoint: 'vision' | 'places';
  timestamp: Timestamp;
  estimatedCost: number; // USD
  metadata?: Record<string, unknown>;
}

export const GROUP_COLORS = [
  '#E74C3C', '#3498DB', '#2ECC71', '#F39C12', '#9B59B6',
  '#1ABC9C', '#E67E22', '#34495E', '#E91E63', '#00BCD4',
  '#8BC34A', '#FF5722', '#607D8B', '#795548', '#CDDC39',
];
