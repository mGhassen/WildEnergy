import { NextRequest, NextResponse } from 'next/server';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  // TODO: Implement logic to update plan by ID
  return NextResponse.json({ message: `Update plan ${params.id}` });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  // TODO: Implement logic to delete plan by ID
  return NextResponse.json({ message: `Delete plan ${params.id}` });
} 