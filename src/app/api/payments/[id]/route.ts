import { NextRequest, NextResponse } from 'next/server';

function extractIdFromUrl(request: NextRequest): string | null {
  const match = request.nextUrl.pathname.match(/\/payments\/(.+?)(\/|$)/);
  return match ? match[1] : null;
}

export async function PUT(request: NextRequest) {
  const id = extractIdFromUrl(request);
  // TODO: Implement logic to update payment by ID
  return NextResponse.json({ message: `Update payment ${id}` });
}

export async function DELETE(request: NextRequest) {
  const id = extractIdFromUrl(request);
  // TODO: Implement logic to delete payment by ID
  return NextResponse.json({ message: `Delete payment ${id}` });
} 