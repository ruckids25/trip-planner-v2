'use client';

import { useState, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import ImageDropzone from '@/components/upload/ImageDropzone';
import ProcessingCard, { ProcessingItem } from '@/components/upload/ProcessingCard';
import ExtractedList from '@/components/upload/ExtractedList';
import { useTrip } from '@/hooks/useTrip';
import { useSpots } from '@/hooks/useSpots';
import { useToast } from '@/components/ui/Toast';
import { resizeAndCompress } from '@/lib/image-utils';
import { ocrImage, lookupPlace } from '@/lib/vision';
import { Spot, SpotType } from '@/types';
import { ArrowRight } from 'lucide-react';

function guessSpotType(types: string[]): SpotType {
  const typeMap: Record<string, SpotType> = {
    temple: 'temple', shrine: 'shrine', church: 'temple',
    restaurant: 'food', food: 'food', bakery: 'food', meal_delivery: 'food',
    cafe: 'cafe', coffee: 'cafe',
    store: 'shopping', shopping_mall: 'shopping', clothing_store: 'shopping',
    park: 'park', garden: 'park',
    museum: 'museum', art_gallery: 'museum', library: 'museum',
    tourist_attraction: 'attraction', amusement_park: 'attraction', zoo: 'attraction',
    train_station: 'transport', bus_station: 'transport', subway_station: 'transport',
    lodging: 'hotel', hotel: 'hotel',
  };
  for (const t of types) {
    const mapped = typeMap[t.toLowerCase()];
    if (mapped) return mapped;
  }
  return 'other';
}

export default function UploadPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = use(params);
  const { trip } = useTrip(tripId);
  const { addBatch } = useSpots(tripId);
  const { toast } = useToast();
  const router = useRouter();

  const [processing, setProcessing] = useState<ProcessingItem[]>([]);
  const [extractedSpots, setExtractedSpots] = useState<Omit<Spot, 'id' | 'createdAt'>[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleFiles = useCallback(async (files: File[]) => {
    setIsProcessing(true);

    for (const file of files) {
      const itemId = `${file.name}-${Date.now()}`;

      setProcessing(prev => [...prev, {
        id: itemId,
        fileName: file.name,
        status: 'ocr',
      }]);

      try {
        // Step 1: Resize + OCR
        const base64 = await resizeAndCompress(file);
        const { placeNames } = await ocrImage(base64);

        if (placeNames.length === 0) {
          setProcessing(prev => prev.map(p =>
            p.id === itemId ? { ...p, status: 'done' as const, resolvedCount: 0, totalCount: 0 } : p
          ));
          continue;
        }

        // Step 2: Lookup each place
        setProcessing(prev => prev.map(p =>
          p.id === itemId ? { ...p, status: 'searching' as const, totalCount: placeNames.length, resolvedCount: 0 } : p
        ));

        let resolved = 0;
        for (const name of placeNames) {
          const place = await lookupPlace(name, trip?.country || '');
          if (place && place.lat && place.lng) {
            setExtractedSpots(prev => [...prev, {
              name: place.name,
              lat: place.lat,
              lng: place.lng,
              type: guessSpotType(place.types),
              address: place.address || '',
              hours: place.hours || '',
              rating: place.rating ?? null,
              photoRef: place.photoRef || '',
              source: 'ocr' as const,
            }]);
            resolved++;
          }
          setProcessing(prev => prev.map(p =>
            p.id === itemId ? { ...p, resolvedCount: resolved } : p
          ));
        }

        setProcessing(prev => prev.map(p =>
          p.id === itemId ? { ...p, status: 'done' as const, resolvedCount: resolved } : p
        ));
      } catch (error) {
        setProcessing(prev => prev.map(p =>
          p.id === itemId ? { ...p, status: 'error' as const, error: 'Processing failed' } : p
        ));
      }
    }

    setIsProcessing(false);
  }, [trip]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await addBatch(extractedSpots);
      toast(`Saved ${extractedSpots.length} places to trip!`, 'success');
      setExtractedSpots([]);
      setProcessing([]);
    } catch {
      toast('Failed to save places', 'error');
    }
    setSaving(false);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Upload Screenshots</h2>
        <p className="text-sm text-gray-500 mt-1">
          Upload screenshots from Google Maps or any image with place names.
          AI will extract and identify each location.
        </p>
      </div>

      <ImageDropzone onFilesSelected={handleFiles} disabled={isProcessing} />

      {processing.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-700">Processing</h3>
          {processing.map(item => (
            <ProcessingCard key={item.id} item={item} />
          ))}
        </div>
      )}

      <ExtractedList
        spots={extractedSpots}
        onUpdate={(i, data) => setExtractedSpots(prev => prev.map((s, idx) => idx === i ? { ...s, ...data } : s))}
        onRemove={(i) => setExtractedSpots(prev => prev.filter((_, idx) => idx !== i))}
        onSave={handleSave}
        saving={saving}
      />

      <div className="flex justify-end pt-4 border-t border-gray-100">
        <button
          onClick={() => router.push(`/trips/${tripId}/manage`)}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors font-medium text-sm"
        >
          Next: Manage Groups <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
