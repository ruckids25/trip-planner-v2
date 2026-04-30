import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { placeId } = await req.json();
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'Places API key not configured' }, { status: 500 });
    }

    const response = await fetch(
      `https://places.googleapis.com/v1/places/${placeId}`,
      {
        headers: {
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'id,displayName,formattedAddress,location,types,rating,currentOpeningHours,photos,primaryType,websiteUri',
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json({ error: 'Place details fetch failed' }, { status: 500 });
    }

    const p = await response.json();
    return NextResponse.json({
      placeId: p.id,
      name: p.displayName?.text || '',
      lat: p.location?.latitude || 0,
      lng: p.location?.longitude || 0,
      address: p.formattedAddress || '',
      types: p.types || [],
      rating: p.rating || null,
      hours: p.currentOpeningHours?.weekdayDescriptions?.join(' | ') || '',
      photoRef: p.photos?.[0]?.name || '',
      website: p.websiteUri || '',
    });
  } catch (error) {
    console.error('Place details error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
