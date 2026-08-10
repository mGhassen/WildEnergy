import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: memberId } = await params;

    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const {
      data: { user: adminUser },
      error: authError,
    } = await supabaseServer().auth.getUser(token);
    if (authError || !adminUser) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const { data: adminCheck } = await supabaseServer()
      .from('user_profiles')
      .select('is_admin, accessible_portals')
      .eq('email', adminUser.email)
      .single();

    if (!adminCheck?.is_admin || !adminCheck?.accessible_portals?.includes('admin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { data: member, error: memberError } = await supabaseServer()
      .from('members')
      .select('id, account_id, profile_id, status')
      .eq('id', memberId)
      .single();

    if (memberError || !member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    if (!member.profile_id) {
      return NextResponse.json(
        { error: 'Member has no profile — cannot create trainer role' },
        { status: 400 },
      );
    }

    const { data: existingTrainer } = await supabaseServer()
      .from('trainers')
      .select('id')
      .eq('profile_id', member.profile_id)
      .maybeSingle();

    if (existingTrainer) {
      return NextResponse.json(
        { error: 'This member already has a trainer role', trainerId: existingTrainer.id },
        { status: 400 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const {
      specialization = '',
      experienceYears = 0,
      bio = '',
      certification = '',
      hourlyRate = 0,
      status = 'active',
    } = body || {};

    // Prefer account already linked to this person (member.account_id or accounts.profile_id).
    let accountId = member.account_id;
    if (!accountId) {
      const { data: account } = await supabaseServer()
        .from('accounts')
        .select('id')
        .eq('profile_id', member.profile_id)
        .maybeSingle();
      accountId = account?.id ?? null;
    }

    const { data: trainer, error: trainerError } = await supabaseServer()
      .from('trainers')
      .insert({
        account_id: accountId,
        profile_id: member.profile_id,
        specialization,
        experience_years: experienceYears || 0,
        bio,
        certification,
        hourly_rate: hourlyRate || 0,
        status: status || 'active',
      })
      .select()
      .single();

    if (trainerError || !trainer) {
      return NextResponse.json(
        { error: trainerError?.message || 'Failed to create trainer' },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Trainer role created for this member',
        trainer: {
          id: trainer.id,
          account_id: trainer.account_id,
          profile_id: trainer.profile_id,
          member_id: member.id,
          status: trainer.status,
        },
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error('Create trainer from member error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 },
    );
  }
}
