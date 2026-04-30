import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { query, country } = await req.json();
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'Places API key not configured' }, { status: 500 });
    }

    // Text Search (New API)
    const searchResponse = await fetch(
      'https://places.googleapis.com/v1/places:searchText',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.types,places.rating,places.currentOpeningHours,places.photos,places.primaryType',
        },
        body: JSON.stringify({
          textQuery: `${query} ${country || ''}`.trim(),
          maxResultCount: 5,
        }),
      }
    );

    if (!searchResponse.ok) {
      const err = await searchResponse.text();
      console.error('Places search error:', err);
      return NextResponse.json({ error: 'Places search failed' }, { status: 500 });
    }

    const data = await searchResponse.json();
    const places = (data.places || []).map((p: Record<string, unknown>) => {
      const loc = p.location as { latitude: number; longitude: number } | undefined;
      const displayName = p.displayName as { text: string; languageCode: string } | undefined;
      const hours = p.currentOpeningHours as { weekdayDescriptions?: string[] } | undefined;
      const photos = p.photos as Array<{ name: string }> | undefined;

      return {
        placeId: p.id,
        name: displayName?.text || query,
        lat: loc?.latitude || 0,
        lng: loc?.longitude || 0,
        address: p.formattedAddress || '',
        types: p.types || [],
        primaryType: p.primaryType || '',
        rating: p.rating || null,
        hours: hours?.weekdayDescriptions?.join(' | ') || '',
        photoRef: photos?.[0]?.name || '',
      };
    });

    return NextResponse.json({ places });
  } catch (error) {
    console.error('Places route error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
