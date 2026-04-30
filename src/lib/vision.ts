// OCR text → extract place names
const NOISE_PATTERNS = [
  /^[\d\s.,+\-()]+$/,                    // pure numbers
  /^https?:\/\//,                         // URLs
  /^(google|maps|directions|saved)/i,     // Google Maps UI text
  /^(search|nearby|explore|more info)/i,  // UI text
  /^(open|closed|hours|reviews?|photos?|share|save|directions)/i,
  /^(km|mi|min|hrs?|am|pm)$/i,           // units
  /^[฀-๿]{1}$/,                // single Thai char
  /^.{1,2}$/,                            // too short
  /^\d+\.\d+$/,                          // coordinates
  /^[\s​]+$/,                        // whitespace only
];

const GMAPS_UI_WORDS = new Set([
  'google', 'maps', 'search', 'here', 'directions', 'saved', 'contribute',
  'updates', 'more', 'menu', 'layers', 'share', 'send', 'embed',
  'traffic', 'transit', 'cycling', 'satellite', 'terrain', 'explore',
  'restaurants', 'hotels', 'things', 'pharmacies', 'atms', 'gas',
  'your', 'location', 'recents', 'transit', 'walking', 'driving',
  'overview', 'about', 'reviews', 'photos', 'suggest', 'edit',
  'label', 'visited', 'want', 'starred', 'places',
]);

export function extractPlaceNames(rawText: string): string[] {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);

  const candidates: string[] = [];

  for (const line of lines) {
    // Skip noise
    if (NOISE_PATTERNS.some(p => p.test(line))) continue;

    // Skip pure Google Maps UI words
    const lower = line.toLowerCase();
    if (GMAPS_UI_WORDS.has(lower)) continue;

    // Skip lines that are mostly numbers (ratings like "4.5 (2,345)")
    if (/^\d+\.?\d*\s*\([\d,]+\)/.test(line)) continue;

    // Skip common address patterns (just numbers + street)
    if (/^\d+[-\s]\d+/.test(line) && line.length < 15) continue;

    // Good candidate: has some non-ASCII (Japanese/Thai) or looks like a place name
    const hasJapanese = /[　-鿿豈-﫿]/.test(line);
    const hasThaiOrLatin = /[฀-๿]/.test(line) || /[a-zA-Z]/.test(line);
    const isLongEnough = line.length >= 3;

    if (isLongEnough && (hasJapanese || hasThaiOrLatin)) {
      candidates.push(line);
    }
  }

  // Deduplicate (case-insensitive)
  const seen = new Set<string>();
  return candidates.filter(c => {
    const key = c.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function ocrImage(base64Image: string): Promise<{ rawText: string; placeNames: string[] }> {
  const res = await fetch('/api/vision', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: base64Image }),
  });

  if (!res.ok) throw new Error('OCR failed');

  const { rawText } = await res.json();
  const placeNames = extractPlaceNames(rawText);

  return { rawText, placeNames };
}

export async function lookupPlace(name: string, country: string): Promise<{
  placeId: string;
  name: string;
  lat: number;
  lng: number;
  address: string;
  types: string[];
  rating: number | null;
  hours: string;
  photoRef: string;
} | null> {
  const res = await fetch('/api/places/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: name, country }),
  });

  if (!res.ok) return null;

  const { places } = await res.json();
  return places?.[0] || null;
}
