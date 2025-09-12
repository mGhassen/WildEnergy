import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const { memberId } = await params;

    if (!memberId) {
      return NextResponse.json({ error: 'Member ID is required' }, { status: 400 });
    }

    const now = new Date().toISOString();

    // First, get the currently active terms version (only terms, not interior regulations)
    const { data: activeTerms, error: termsError } = await supabaseServer()
      .from('terms_and_conditions')
      .select('id, version, title')
      .eq('term_type', 'terms')
      .eq('is_active', true)
      .single();

    if (termsError || !activeTerms) {
      console.error('Error fetching active terms:', termsError);
      return NextResponse.json({ error: 'No active terms version found' }, { status: 500 });
    }

    // Update onboarding data to accept terms and complete onboarding
    const { data: onboarding, error } = await supabaseServer()
      .from('member_onboarding')
      .update({
        terms_accepted: true,
        terms_accepted_at: now,
        terms_version_id: activeTerms.id,
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

    return NextResponse.json({
      ...onboarding,
      terms_version: activeTerms.version,
      terms_title: activeTerms.title
    });
  } catch (error) {
    console.error('Accept terms API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
