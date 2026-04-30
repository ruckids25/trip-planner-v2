import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { image } = await req.json();
    const apiKey = process.env.GOOGLE_VISION_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'Vision API key not configured' }, { status: 500 });
    }

    // Remove data URL prefix if present
    const base64Image = image.replace(/^data:image\/\w+;base64,/, '');

    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            image: { content: base64Image },
            features: [{ type: 'TEXT_DETECTION', maxResults: 50 }],
          }],
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error('Vision API error:', err);
      return NextResponse.json({ error: 'Vision API request failed' }, { status: 500 });
    }

    const data = await response.json();
    const annotations = data.responses?.[0]?.textAnnotations || [];

    // First annotation is the full text, rest are individual words/phrases
    const rawText = annotations[0]?.description || '';
    const texts = annotations.slice(1).map((a: { description: string }) => a.description);

    return NextResponse.json({ rawText, texts });
  } catch (error) {
    console.error('Vision route error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
