import { NextRequest, NextResponse } from 'next/server';

function extractRegistrationIdFromUrl(request: NextRequest): string | null {
  const match = request.nextUrl.pathname.match(/\/checkins\/([^/]+)\/unvalidate/);
  return match ? match[1] : null;
}

export async function POST(request: NextRequest) {
  const registrationId = extractRegistrationIdFromUrl(request);
  // TODO: Implement logic to unvalidate check-in
  return NextResponse.json({ message: `Unvalidate check-in for registration ${registrationId}` });
} 