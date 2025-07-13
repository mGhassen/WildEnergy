import { NextRequest, NextResponse } from 'next/server';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  // TODO: Implement logic to update course by ID
  return NextResponse.json({ message: `Update course ${params.id}` });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  // TODO: Implement logic to delete course by ID
  return NextResponse.json({ message: `Delete course ${params.id}` });
} 