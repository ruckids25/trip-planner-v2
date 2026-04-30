'use client';

import { useState, useCallback, useRef } from 'react';
import { Search, MapPin, Plus, Loader2 } from 'lucide-react';
import { SpotType, SPOT_TYPE_CONFIG } from '@/types';

interface SearchResult {
  name: string;
  lat: number;
  lng: number;
  address: string;
  types: string[];
  rating: number | null;
  hours: string;
}

interface PlaceSearchProps {
  country: string;
  onAdd: (result: SearchResult & { type: SpotType }) => void;
}

export default function PlaceSearch({ country, onAdd }: PlaceSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>(null);

  const search = useCallback(async (q: string) => {
    if (q.length < 3) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/places/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, country }),
      });
      if (res.ok) {
        const { places } = await res.json();
        setResults(places || []);
        setShowResults(true);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [country]);

  const handleInput = (value: string) => {
    setQuery(value);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => search(value), 500) as unknown as NodeJS.Timeout;
  };

  const handleAdd = (result: SearchResult) => {
    const type = guessType(result.types);
    onAdd({ ...result, type });
    setShowResults(false);
    setQuery('');
    setResults([]);
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
        <Search size={16} className="text-gray-400" />
        <input
          value={query}
          onChange={e => handleInput(e.target.value)}
          placeholder="Search for a place to add..."
          className="flex-1 text-sm outline-none bg-transparent"
          onFocus={() => results.length > 0 && setShowResults(true)}
        />
        {loading && <Loader2 size={16} className="animate-spin text-gray-400" />}
      </div>

      {showResults && results.length > 0 && (
        <div className="absolute top-12 left-0 right-0 bg-white rounded-xl border border-gray-200 shadow-lg z-50 max-h-64 overflow-y-auto">
          {results.map((r, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0"
              onClick={() => handleAdd(r)}
            >
              <MapPin size={14} className="text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{r.name}</p>
                <p className="text-xs text-gray-400 truncate">{r.address}</p>
              </div>
              <button className="p-1 hover:bg-blue-50 rounded text-blue-500">
                <Plus size={14} />
              </button>
            </div>
          ))}

          <div
            className="flex items-center gap-2 px-3 py-2 text-xs text-blue-500 font-medium hover:bg-blue-50 cursor-pointer border-t border-gray-100"
            onClick={() => window.open(`https://www.google.com/maps/search/${encodeURIComponent(query + ' ' + country)}`, '_blank')}
          >
            <Search size={12} /> Search in Google Maps
          </div>
        </div>
      )}
    </div>
  );
}

function guessType(types: string[]): SpotType {
  const map: Record<string, SpotType> = {
    temple: 'temple', shrine: 'shrine', restaurant: 'food', cafe: 'cafe',
    store: 'shopping', shopping_mall: 'shopping', park: 'park',
    museum: 'museum', tourist_attraction: 'attraction', train_station: 'transport',
    lodging: 'hotel',
  };
  for (const t of types) {
    if (map[t]) return map[t];
  }
  return 'other';
}
