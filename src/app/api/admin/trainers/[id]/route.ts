import { NextRequest, NextResponse } from 'next/server';

function extractIdFromUrl(request: NextRequest): string | null {
  const match = request.nextUrl.pathname.match(/\/trainers\/(.+?)(\/|$)/);
  return match ? match[1] : null;
}

export async function PUT(request: NextRequest) {
  const id = extractIdFromUrl(request);
  // TODO: Implement logic to update trainer by ID
  return NextResponse.json({ message: `Update trainer ${id}` });
}

export async function DELETE(request: NextRequest) {
  const id = extractIdFromUrl(request);
  // TODO: Implement logic to delete trainer by ID
  return NextResponse.json({ message: `Delete trainer ${id}` });
} 