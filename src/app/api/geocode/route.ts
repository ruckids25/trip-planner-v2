import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { query, countryCode } = await req.json();

    const params = new URLSearchParams({
      format: 'json',
      q: query,
      limit: '5',
      'accept-language': 'en,ja,th',
      addressdetails: '1',
    });
    if (countryCode) params.set('countrycodes', countryCode);

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?${params}`,
      { headers: { 'User-Agent': 'TripPlannerV2/1.0' } }
    );

    if (!response.ok) {
      return NextResponse.json({ error: 'Geocoding failed' }, { status: 500 });
    }

    const results = await response.json();
    const places = results.map((r: Record<string, unknown>) => ({
      lat: parseFloat(r.lat as string),
      lng: parseFloat(r.lon as string),
      displayName: r.display_name as string,
      type: r.type as string,
    }));

    return NextResponse.json({ places });
  } catch (error) {
    console.error('Geocode error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
