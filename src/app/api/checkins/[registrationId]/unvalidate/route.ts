import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest, { params }: { params: { registrationId: string } }) {
  // TODO: Implement logic to unvalidate a checkin by registrationId
  return NextResponse.json({ message: `Unvalidate checkin for registration ${params.registrationId}` });
} 