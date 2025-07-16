import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

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
  if (!id) {
    return NextResponse.json({ error: 'Missing user id' }, { status: 400 });
  }

  // Delete from users table
  const { error: dbError } = await supabaseServer
    .from('users')
    .delete()
    .eq('id', id);

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  // Delete from Supabase Auth
  const { error: authError } = await supabaseServer.auth.admin.deleteUser(id);
  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 });
  }

  return NextResponse.json({ message: `User ${id} deleted` });
} 