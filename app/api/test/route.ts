import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  return NextResponse.json({ message: 'Test route working' });
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams.entries());
  
  return NextResponse.json({ 
    message: 'Delete route working',
    params
  });
} 