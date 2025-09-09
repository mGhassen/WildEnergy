import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Get the active terms and conditions
    const { data: terms, error } = await supabaseServer()
      .from('terms_and_conditions')
      .select('*')
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Error fetching terms:', error);
      return NextResponse.json({ error: 'Failed to fetch terms and conditions' }, { status: 500 });
    }

    if (!terms) {
      return NextResponse.json({ error: 'No active terms and conditions found' }, { status: 404 });
    }

    return NextResponse.json(terms);
  } catch (error) {
    console.error('Terms API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
