import { NextRequest, NextResponse } from 'next/server';

function extractIdFromUrl(request: NextRequest): string | null {
  const match = request.nextUrl.pathname.match(/\/users\/(.+?)(\/|$)/);
  return match ? match[1] : null;
}

export async function GET(request: NextRequest) {
  const id = extractIdFromUrl(request);
  // TODO: Implement logic to fetch user by ID
  return NextResponse.json({ message: `User ID: ${id}` });
}

export async function PUT(request: NextRequest) {
  const id = extractIdFromUrl(request);
  // TODO: Implement logic to update user by ID
  return NextResponse.json({ message: `Update user ${id}` });
}

export async function DELETE(request: NextRequest) {
  const id = extractIdFromUrl(request);
  // TODO: Implement logic to delete user by ID
  return NextResponse.json({ message: `Delete user ${id}` });
} 