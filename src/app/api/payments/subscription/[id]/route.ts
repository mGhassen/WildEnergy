import { NextRequest, NextResponse } from 'next/server';

function extractIdFromUrl(request: NextRequest): string | null {
  const match = request.nextUrl.pathname.match(/\/payments\/subscription\/([^/]+)/);
  return match ? match[1] : null;
}

export async function GET(request: NextRequest) {
  const id = extractIdFromUrl(request);
  // TODO: Implement logic to get payment by subscription ID
  return NextResponse.json({ message: `Get payment for subscription ${id}` });
} 