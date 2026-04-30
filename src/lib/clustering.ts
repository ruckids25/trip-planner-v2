import { Spot, Group, GROUP_COLORS, LatLng } from '@/types';
import { haversineDistance, centroid } from './geo-utils';

interface ClusterOptions {
  maxDistanceKm?: number; // default 1.5
  minPoints?: number;     // default 1
}

export function clusterSpots(
  spots: Spot[],
  options: ClusterOptions = {}
): Group[] {
  const { maxDistanceKm = 1.5, minPoints = 1 } = options;

  if (spots.length === 0) return [];

  // Build distance matrix
  const n = spots.length;
  const dist: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const d = haversineDistance(
        { lat: spots[i].lat, lng: spots[i].lng },
        { lat: spots[j].lat, lng: spots[j].lng }
      );
      dist[i][j] = d;
      dist[j][i] = d;
    }
  }

  // DBSCAN
  const labels: number[] = Array(n).fill(-1); // -1 = unvisited
  let clusterId = 0;

  for (let i = 0; i < n; i++) {
    if (labels[i] !== -1) continue;

    // Find neighbors
    const neighbors = getNeighbors(i, dist, maxDistanceKm, n);

    if (neighbors.length < minPoints) {
      // Noise point — will be assigned to its own cluster later
      labels[i] = -2;
      continue;
    }

    // Expand cluster
    labels[i] = clusterId;
    const queue = [...neighbors];
    const visited = new Set<number>([i]);

    while (queue.length > 0) {
      const j = queue.shift()!;
      if (visited.has(j)) continue;
      visited.add(j);

      if (labels[j] === -2) {
        labels[j] = clusterId; // Was noise, now border
      }
      if (labels[j] !== -1) continue;

      labels[j] = clusterId;

      const jNeighbors = getNeighbors(j, dist, maxDistanceKm, n);
      if (jNeighbors.length >= minPoints) {
        queue.push(...jNeighbors);
      }
    }

    clusterId++;
  }

  // Assign noise points to their own cluster
  for (let i = 0; i < n; i++) {
    if (labels[i] === -2) {
      labels[i] = clusterId++;
    }
  }

  // Build groups
  const groupMap = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const lbl = labels[i];
    if (!groupMap.has(lbl)) groupMap.set(lbl, []);
    groupMap.get(lbl)!.push(i);
  }

  const groups: Group[] = [];
  let colorIdx = 0;

  for (const [, indices] of groupMap) {
    const groupSpots = indices.map(i => spots[i]);
    const points: LatLng[] = groupSpots.map(s => ({ lat: s.lat, lng: s.lng }));
    const center = centroid(points);

    groups.push({
      id: `group-${groups.length}`,
      label: `Group ${groups.length + 1}`,
      color: GROUP_COLORS[colorIdx % GROUP_COLORS.length],
      center,
      spotIds: groupSpots.map(s => s.id),
    });
    colorIdx++;
  }

  return groups;
}

function getNeighbors(idx: number, dist: number[][], eps: number, n: number): number[] {
  const neighbors: number[] = [];
  for (let j = 0; j < n; j++) {
    if (j !== idx && dist[idx][j] <= eps) {
      neighbors.push(j);
    }
  }
  return neighbors;
}

export async function autoLabelGroups(groups: Group[], countryCode?: string): Promise<Group[]> {
  const labeled = await Promise.all(
    groups.map(async (group) => {
      try {
        const res = await fetch('/api/geocode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `${group.center.lat},${group.center.lng}`,
            countryCode,
          }),
        });
        if (res.ok) {
          const { places } = await res.json();
          if (places?.[0]?.displayName) {
            // Extract area name from display name (usually first part)
            const parts = places[0].displayName.split(',');
            const areaName = parts[0]?.trim() || group.label;
            return { ...group, label: areaName };
          }
        }
      } catch {
        // fallback to default label
      }
      return group;
    })
  );
  return labeled;
}
