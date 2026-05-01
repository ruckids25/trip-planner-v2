'use client';

import { useEffect, useRef } from 'react';
import { Spot, SPOT_TYPE_CONFIG } from '@/types';

interface PlanMapProps {
  spots: Spot[];
  dayColor: string;
  hotelLat?: number;
  hotelLng?: number;
  selectedSpotId?: string;
  onSpotSelect?: (spotId: string) => void;
}

export default function PlanMap({ spots, dayColor, hotelLat, hotelLng, selectedSpotId, onSpotSelect }: PlanMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current) return;

    const initMap = async () => {
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');

      if (mapInstanceRef.current) mapInstanceRef.current.remove();

      const map = L.map(mapRef.current!, {
        center: [35.6762, 139.6503],
        zoom: 13,
      });

      // Minimal map style — no POI icons, cafes, restaurants etc.
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
        maxZoom: 19,
        subdomains: 'abcd',
      }).addTo(map);

      mapInstanceRef.current = map;

      const bounds: [number, number][] = [];

      // Hotel marker
      if (hotelLat && hotelLng) {
        const hotelIcon = L.divIcon({
          html: `<div style="width:24px;height:24px;background:#34495E;border:2px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;box-shadow:0 2px 6px rgba(0,0,0,0.3);">🏨</div>`,
          className: '',
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });
        L.marker([hotelLat, hotelLng], { icon: hotelIcon }).addTo(map).bindPopup('Hotel');
        bounds.push([hotelLat, hotelLng]);
      }

      // Route polyline
      if (spots.length > 1) {
        const polylineCoords: [number, number][] = spots.map(s => [s.lat, s.lng]);
        L.polyline(polylineCoords, {
          color: dayColor,
          weight: 3,
          opacity: 0.5,
          dashArray: '8, 8',
        }).addTo(map);
      }

      // Spot markers
      spots.forEach((spot, i) => {
        const isSelected = spot.id === selectedSpotId;
        const tc = SPOT_TYPE_CONFIG[spot.type] || SPOT_TYPE_CONFIG.other;

        const icon = L.divIcon({
          html: `<div style="
            width:${isSelected ? 32 : 26}px;
            height:${isSelected ? 32 : 26}px;
            background:${dayColor};
            border:2px solid white;
            border-radius:50%;
            display:flex;align-items:center;justify-content:center;
            font-size:${isSelected ? 12 : 10}px;
            font-weight:bold;color:white;
            box-shadow:0 2px 6px rgba(0,0,0,0.3);
            ${isSelected ? 'transform:scale(1.2);z-index:1000;' : ''}
          ">${i + 1}</div>`,
          className: '',
          iconSize: [isSelected ? 32 : 26, isSelected ? 32 : 26],
          iconAnchor: [isSelected ? 16 : 13, isSelected ? 16 : 13],
        });

        const marker = L.marker([spot.lat, spot.lng], { icon })
          .addTo(map)
          .bindPopup(`<b>${i + 1}. ${spot.name}</b><br/>${tc.emoji} ${tc.label}`);

        marker.on('click', () => onSpotSelect?.(spot.id));
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
  }, [spots, dayColor, hotelLat, hotelLng, selectedSpotId, onSpotSelect]);

  return <div ref={mapRef} className="w-full h-full min-h-[400px] rounded-xl overflow-hidden" />;
}
