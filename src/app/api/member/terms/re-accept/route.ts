import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    // Verify user
    const { data: { user }, error: authError } = await supabaseServer().auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    // Get user profile to find member_id
    const { data: userProfile, error: profileError } = await supabaseServer()
      .from('user_profiles')
      .select('member_id')
      .eq('email', user.email)
      .single();

    if (profileError || !userProfile?.member_id) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const memberId = userProfile.member_id;
    const now = new Date().toISOString();

    // Get the currently active terms version (only terms, not interior regulations)
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

    // Update member onboarding to accept new terms version
    const { data: onboarding, error } = await supabaseServer()
      .from('member_onboarding')
      .update({
        terms_accepted: true,
        terms_accepted_at: now,
        terms_version_id: activeTerms.id,
        updated_at: now
      })
      .eq('member_id', memberId)
      .select()
      .single();

    if (error) {
      console.error('Error updating terms acceptance:', error);
      return NextResponse.json({ error: 'Failed to update terms acceptance' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Terms re-accepted successfully',
      terms_version: activeTerms.version,
      terms_title: activeTerms.title,
      accepted_at: now
    });
  } catch (error) {
    console.error('Terms re-acceptance error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
