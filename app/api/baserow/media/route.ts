import { NextResponse } from 'next/server';

const BASEROW_BASE_URL = 'http://host.docker.internal:85';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path');

  if (!path) {
    return NextResponse.json({ error: 'No path provided' }, { status: 400 });
  }

  try {
    const response = await fetch(`${BASEROW_BASE_URL}/media/${path}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType || 'image/png',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } catch (error) {
    console.error('Media proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch media' },
      { status: 500 }
    );
  }
} 