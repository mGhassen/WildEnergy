import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Get the active interior regulation
    const { data: interiorRegulation, error } = await supabaseServer()
      .from('terms_and_conditions')
      .select('*')
      .eq('term_type', 'interior_regulation')
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Error fetching interior regulation:', error);
      return NextResponse.json({ error: 'Failed to fetch interior regulation' }, { status: 500 });
    }

    if (!interiorRegulation) {
      return NextResponse.json({ error: 'No active interior regulation found' }, { status: 404 });
    }

    return NextResponse.json(interiorRegulation);
  } catch (error) {
    console.error('Interior regulation API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
