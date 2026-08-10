import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { mapMemberStatusToAccountStatus } from '@/lib/status-mapping';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: trainerId } = await params;

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

    const { data: trainerData, error: trainerError } = await supabaseServer()
      .from('trainers')
      .select(
        `
        *,
        profiles!inner(
          first_name,
          last_name,
          phone,
          profile_email
        )
      `,
      )
      .eq('id', trainerId)
      .single();

    if (trainerError || !trainerData) {
      return NextResponse.json({ error: 'Trainer not found' }, { status: 404 });
    }

    if (trainerData.account_id) {
      return NextResponse.json({ error: 'Trainer already has an account' }, { status: 400 });
    }

    // If a member on the same profile already has an account, just link it.
    const { data: member } = await supabaseServer()
      .from('members')
      .select('id, account_id')
      .eq('profile_id', trainerData.profile_id)
      .maybeSingle();

    if (member?.account_id) {
      const { error: linkError } = await supabaseServer()
        .from('trainers')
        .update({ account_id: member.account_id })
        .eq('id', trainerId);

      if (linkError) {
        return NextResponse.json(
          { error: linkError.message || 'Failed to link existing account' },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Linked existing member account to trainer',
        accountId: member.account_id,
      });
    }

    const { email, password, isAdmin = false } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const { data: authData, error: signUpError } = await supabaseServer().auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: trainerData.profiles.first_name,
          last_name: trainerData.profiles.last_name,
        },
      },
    });

    if (signUpError || !authData.user) {
      return NextResponse.json(
        { error: signUpError?.message || 'Failed to create auth user' },
        { status: 400 },
      );
    }

    const authUserId = authData.user.id;

    try {
      const accountStatus = mapMemberStatusToAccountStatus(trainerData.status || 'active');

      const { error: accountError } = await supabaseServer()
        .from('accounts')
        .insert({
          id: authUserId,
          auth_user_id: authUserId,
          email,
          status: accountStatus,
          is_admin: isAdmin,
          profile_id: trainerData.profile_id,
        });

      if (accountError) {
        throw new Error(`Failed to create account: ${accountError.message}`);
      }

      const { error: trainerUpdateError } = await supabaseServer()
        .from('trainers')
        .update({ account_id: authUserId })
        .eq('id', trainerId);

      if (trainerUpdateError) {
        throw new Error(`Failed to link trainer to account: ${trainerUpdateError.message}`);
      }

      // Same person: if member exists without account, link it too.
      if (member && !member.account_id) {
        await supabaseServer()
          .from('members')
          .update({ account_id: authUserId })
          .eq('id', member.id);
      }

      return NextResponse.json(
        {
          success: true,
          message: 'Account created successfully for trainer',
          accountId: authUserId,
        },
        { status: 201 },
      );
    } catch (error: any) {
      await supabaseServer().auth.admin.deleteUser(authUserId);
      return NextResponse.json(
        { success: false, error: 'Failed to create account', details: error.message },
        { status: 500 },
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create account from trainer',
        details: error.message,
      },
      { status: 500 },
    );
  }
}
