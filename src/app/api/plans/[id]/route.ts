import { NextRequest, NextResponse } from 'next/server';

function extractIdFromUrl(request: NextRequest): string | null {
  const match = request.nextUrl.pathname.match(/\/plans\/(.+?)(\/|$)/);
  return match ? match[1] : null;
}

export async function PUT(request: NextRequest) {
  const id = extractIdFromUrl(request);
  // TODO: Implement logic to update plan by ID
  return NextResponse.json({ message: `Update plan ${id}` });
}

export async function DELETE(request: NextRequest) {
  const id = extractIdFromUrl(request);
  // TODO: Implement logic to delete plan by ID
  return NextResponse.json({ message: `Delete plan ${id}` });
} 