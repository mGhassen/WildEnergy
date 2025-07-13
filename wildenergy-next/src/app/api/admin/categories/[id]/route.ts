import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  // TODO: Implement logic to update category by ID
  return NextResponse.json({ message: `Update category ${params.id}` });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  // TODO: Implement logic to delete category by ID
  return NextResponse.json({ message: `Delete category ${params.id}` });
} 