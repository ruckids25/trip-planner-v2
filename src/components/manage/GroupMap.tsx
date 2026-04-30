'use client';

import { useEffect, useRef } from 'react';
import { Group, Spot } from '@/types';

interface GroupMapProps {
  groups: Group[];
  spots: Spot[];
  selectedSpotId?: string;
  onSpotSelect?: (spotId: string) => void;
}

export default function GroupMap({ groups, spots, selectedSpotId, onSpotSelect }: GroupMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current) return;

    const initMap = async () => {
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }

      const map = L.map(mapRef.current!, {
        center: [35.6762, 139.6503],
        zoom: 12,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;

      // Add markers
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];

      const bounds: [number, number][] = [];

      spots.forEach(spot => {
        const group = groups.find(g => g.spotIds.includes(spot.id));
        const color = group?.color || '#7F8C8D';
        const isSelected = spot.id === selectedSpotId;

        const icon = L.divIcon({
          html: `<div style="
            width: ${isSelected ? 28 : 22}px;
            height: ${isSelected ? 28 : 22}px;
            background: ${color};
            border: 2px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            ${isSelected ? 'transform: scale(1.2); z-index: 1000;' : ''}
          "></div>`,
          className: '',
          iconSize: [isSelected ? 28 : 22, isSelected ? 28 : 22],
          iconAnchor: [isSelected ? 14 : 11, isSelected ? 14 : 11],
        });

        const marker = L.marker([spot.lat, spot.lng], { icon })
          .addTo(map)
          .bindPopup(`<b>${spot.name}</b><br/>${group?.label || 'Ungrouped'}`);

        marker.on('click', () => onSpotSelect?.(spot.id));
        markersRef.current.push(marker);
        bounds.push([spot.lat, spot.lng]);
      });

      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [40, 40] });
      }
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [groups, spots, selectedSpotId, onSpotSelect]);

  return (
    <div ref={mapRef} className="w-full h-full min-h-[400px] rounded-xl overflow-hidden" />
  );
}
