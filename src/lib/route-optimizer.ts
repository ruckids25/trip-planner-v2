import { Spot, LatLng } from '@/types';
import { haversineDistance } from './geo-utils';

/**
 * Nearest-neighbor heuristic route optimization.
 * Considers opening hours when available.
 */
export function optimizeRoute(spots: Spot[], hotel?: LatLng): Spot[] {
  if (spots.length <= 1) return spots;

  // Separate spots with early opening hours vs rest
  const earlySpots: Spot[] = [];
  const normalSpots: Spot[] = [];

  for (const spot of spots) {
    const openHour = parseOpeningHour(spot.hours || spot.timeOverride);
    if (openHour !== null && openHour <= 9) {
      earlySpots.push(spot);
    } else {
      normalSpots.push(spot);
    }
  }

  // Sort early spots by opening time
  earlySpots.sort((a, b) => {
    const aHour = parseOpeningHour(a.hours || a.timeOverride) ?? 9;
    const bHour = parseOpeningHour(b.hours || b.timeOverride) ?? 9;
    return aHour - bHour;
  });

  // Nearest-neighbor for the rest
  const ordered: Spot[] = [...earlySpots];
  const remaining = [...normalSpots];

  // Start from hotel or last early spot
  let current: LatLng = hotel
    || (earlySpots.length > 0
      ? { lat: earlySpots[earlySpots.length - 1].lat, lng: earlySpots[earlySpots.length - 1].lng }
      : { lat: remaining[0]?.lat || 0, lng: remaining[0]?.lng || 0 });

  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestDist = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const d = haversineDistance(current, { lat: remaining[i].lat, lng: remaining[i].lng });
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }

    const next = remaining.splice(bestIdx, 1)[0];
    ordered.push(next);
    current = { lat: next.lat, lng: next.lng };
  }

  // Assign sortOrder
  return ordered.map((spot, i) => ({
    ...spot,
    sortOrder: i,
  }));
}

function parseOpeningHour(timeStr?: string | null): number | null {
  if (!timeStr) return null;
  const match = timeStr.match(/(\d{1,2}):(\d{2})/);
  if (match) return parseInt(match[1]);
  return null;
}

export function calculateTotalDistance(spots: Spot[]): number {
  let total = 0;
  for (let i = 1; i < spots.length; i++) {
    total += haversineDistance(
      { lat: spots[i - 1].lat, lng: spots[i - 1].lng },
      { lat: spots[i].lat, lng: spots[i].lng }
    );
  }
  return total;
}
