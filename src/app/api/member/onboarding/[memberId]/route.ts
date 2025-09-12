import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const { memberId } = await params;

    if (!memberId) {
      return NextResponse.json({ error: 'Member ID is required' }, { status: 400 });
    }

    // Check authentication
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    // Verify user (member)
    const { data: { user }, error: authError } = await supabaseServer().auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    // Get onboarding data
    const { data: onboarding, error } = await supabaseServer()
      .from('member_onboarding')
      .select('*')
      .eq('member_id', memberId)
      .single();

    if (error) {
      console.error('Error fetching onboarding:', error);
      return NextResponse.json({ error: 'Failed to fetch onboarding data' }, { status: 500 });
    }

    if (!onboarding) {
      return NextResponse.json({ error: 'Onboarding data not found' }, { status: 404 });
    }

    return NextResponse.json(onboarding);
  } catch (error) {
    console.error('Onboarding API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const { memberId } = await params;
    const body = await request.json();

    if (!memberId) {
      return NextResponse.json({ error: 'Member ID is required' }, { status: 400 });
    }

    // Check authentication
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    // Verify user (member)
    const { data: { user }, error: authError } = await supabaseServer().auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    // Update onboarding data
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (body.personal_info_completed !== undefined) {
      updateData.personal_info_completed = body.personal_info_completed;
    }
    if (body.physical_profile_completed !== undefined) {
      updateData.physical_profile_completed = body.physical_profile_completed;
    }
    if (body.physical_profile !== undefined) {
      updateData.physical_profile = body.physical_profile;
    }
    if (body.discovery_source !== undefined) {
      updateData.discovery_source = body.discovery_source;
    }
    if (body.terms_accepted !== undefined) {
      updateData.terms_accepted = body.terms_accepted;
    }
    if (body.terms_accepted_at !== undefined) {
      updateData.terms_accepted_at = body.terms_accepted_at;
    }
    if (body.onboarding_completed !== undefined) {
      updateData.onboarding_completed = body.onboarding_completed;
    }
    if (body.onboarding_completed_at !== undefined) {
      updateData.onboarding_completed_at = body.onboarding_completed_at;
    }

    const { data: onboarding, error } = await supabaseServer()
      .from('member_onboarding')
      .update(updateData)
      .eq('member_id', memberId)
      .select()
      .single();

    if (error) {
      console.error('Error updating onboarding:', error);
      return NextResponse.json({ error: 'Failed to update onboarding data' }, { status: 500 });
    }

    return NextResponse.json(onboarding);
  } catch (error) {
    console.error('Onboarding update API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
