import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  // TODO: Implement logic to fetch payments by subscription ID
  return NextResponse.json({ message: `Fetch payments for subscription ${params.id}` });
} 