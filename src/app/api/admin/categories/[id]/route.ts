import { NextRequest, NextResponse } from 'next/server';

function extractIdFromUrl(request: NextRequest): string | null {
  const match = request.nextUrl.pathname.match(/\/categories\/(.+?)(\/|$)/);
  return match ? match[1] : null;
}

export async function PATCH(request: NextRequest) {
  const id = extractIdFromUrl(request);
  // TODO: Implement logic to update category by ID
  return NextResponse.json({ message: `Update category ${id}` });
}

export async function DELETE(request: NextRequest) {
  const id = extractIdFromUrl(request);
  // TODO: Implement logic to delete category by ID
  return NextResponse.json({ message: `Delete category ${id}` });
} 