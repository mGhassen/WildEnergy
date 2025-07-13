import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function extractIdFromUrl(request: NextRequest): string | null {
  const match = request.nextUrl.pathname.match(/\/classes\/(.+?)(\/|$)/);
  return match ? match[1] : null;
}

export async function PATCH(request: NextRequest) {
  const id = extractIdFromUrl(request);
  // TODO: Implement logic to update class by ID
  return NextResponse.json({ message: `Update class ${id}` });
}

export async function DELETE(request: NextRequest) {
  const id = extractIdFromUrl(request);
  // TODO: Implement logic to delete class by ID
  return NextResponse.json({ message: `Delete class ${id}` });
} 