import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const { data: categories, error } = await supabase
      .from('categories')
      .select(`
        *,
        groups:group_id (
          id,
          name,
          color
        )
      `)
      .order('name', { ascending: true });
    if (error) {
      return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
    }
    return NextResponse.json(categories);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 