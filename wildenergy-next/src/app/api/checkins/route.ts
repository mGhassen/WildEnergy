import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // TODO: Implement logic to fetch all checkins
  return NextResponse.json({ message: 'Fetch all checkins' });
}

export async function POST(req: NextRequest) {
  // TODO: Implement logic to create a new checkin
  return NextResponse.json({ message: 'Create new checkin' });
} 