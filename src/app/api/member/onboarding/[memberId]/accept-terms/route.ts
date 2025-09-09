import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: { memberId: string } }
) {
  try {
    const { memberId } = params;

    if (!memberId) {
      return NextResponse.json({ error: 'Member ID is required' }, { status: 400 });
    }

    const now = new Date().toISOString();

    // Update onboarding data to accept terms and complete onboarding
    const { data: onboarding, error } = await supabaseServer()
      .from('member_onboarding')
      .update({
        terms_accepted: true,
        terms_accepted_at: now,
        onboarding_completed: true,
        onboarding_completed_at: now,
        updated_at: now
      })
      .eq('member_id', memberId)
      .select()
      .single();

    if (error) {
      console.error('Error accepting terms:', error);
      return NextResponse.json({ error: 'Failed to accept terms' }, { status: 500 });
    }

    return NextResponse.json(onboarding);
  } catch (error) {
    console.error('Accept terms API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
