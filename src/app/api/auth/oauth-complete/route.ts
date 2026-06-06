import { NextRequest, NextResponse } from 'next/server';
import { resolveAccessiblePortals } from '@/lib/resolve-accessible-portals';
import { supabaseServer } from '@/lib/supabase';

function buildUserResponse(
  authUser: { email?: string; app_metadata?: { provider?: string } },
  profile: Record<string, any>,
) {
  const accessiblePortals = resolveAccessiblePortals(profile);
  const isAdmin = Boolean(profile.is_admin);
  const role =
    profile.user_type === 'admin' ||
    profile.user_type === 'admin_member' ||
    profile.user_type === 'admin_trainer' ||
    profile.user_type === 'admin_member_trainer'
      ? 'admin'
      : 'member';

  return {
    id: profile.account_id,
    account_id: profile.account_id,
    email: authUser.email || '',
    profileEmail: profile.profile_email || '',
    isAdmin,
    firstName: profile.first_name || authUser.email?.split('@')[0] || 'User',
    lastName: profile.last_name || '',
    phone: profile.phone || '',
    age: profile.date_of_birth
      ? new Date().getFullYear() - new Date(profile.date_of_birth).getFullYear()
      : 0,
    profession: profile.profession || '',
    address: profile.address || '',
    status: profile.account_status || 'active',
    credit: profile.credit ?? 0,
    role,
    userType: profile.user_type,
    accessiblePortals,
    member_id: profile.member_id,
    trainer_id: profile.trainer_id,
    provider: authUser.app_metadata?.provider || 'google',
  };
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return NextResponse.json({ success: false, error: 'No token provided' }, { status: 401 });
    }

    const supabase = supabaseServer();
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !authUser?.email) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 },
      );
    }

    const email = authUser.email;
    const metadata = authUser.user_metadata || {};
    const firstName =
      metadata.first_name || metadata.full_name?.split(' ')[0] || metadata.name?.split(' ')[0] || 'User';
    const lastName =
      metadata.last_name || metadata.full_name?.split(' ').slice(1).join(' ') || metadata.name?.split(' ').slice(1).join(' ') || '';
    const avatarUrl = metadata.avatar_url || metadata.picture || null;

    const { data: existingByEmail } = await supabase
      .from('accounts')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    const { data: existingByAuthId } = await supabase
      .from('accounts')
      .select('id')
      .eq('auth_user_id', authUser.id)
      .maybeSingle();

    let created = false;

    if (!existingByEmail && !existingByAuthId) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          first_name: firstName,
          last_name: lastName,
          profile_image_url: avatarUrl,
        })
        .select('id')
        .single();

      if (profileError) {
        return NextResponse.json(
          { success: false, error: `Failed to create profile: ${profileError.message}` },
          { status: 500 },
        );
      }

      const { data: account, error: accountError } = await supabase
        .from('accounts')
        .insert({
          id: authUser.id,
          auth_user_id: authUser.id,
          email,
          profile_id: profile.id,
          is_admin: false,
          status: 'pending',
          last_login: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (accountError) {
        await supabase.from('profiles').delete().eq('id', profile.id);
        return NextResponse.json(
          { success: false, error: `Failed to create account: ${accountError.message}` },
          { status: 500 },
        );
      }

      const { error: memberError } = await supabase.from('members').insert({
        account_id: account.id,
        profile_id: profile.id,
        member_notes: '',
        status: 'inactive',
        credit: 0,
      });

      if (memberError) {
        await supabase.from('accounts').delete().eq('id', account.id);
        await supabase.from('profiles').delete().eq('id', profile.id);
        return NextResponse.json(
          { success: false, error: `Failed to create member: ${memberError.message}` },
          { status: 500 },
        );
      }

      created = true;
    } else {
      const accountId = existingByEmail?.id || existingByAuthId?.id;
      await supabase
        .from('accounts')
        .update({
          auth_user_id: authUser.id,
          last_login: new Date().toISOString(),
        })
        .eq('id', accountId);
    }

    const { data: userProfile, error: profileLookupError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', email)
      .single();

    if (profileLookupError || !userProfile) {
      return NextResponse.json(
        { success: false, error: 'Account setup incomplete' },
        { status: 500 },
      );
    }

    if (userProfile.account_status === 'pending') {
      return NextResponse.json({
        success: false,
        error: 'Account pending approval',
        status: 'pending',
        email,
      }, { status: 403 });
    }

    if (userProfile.account_status !== 'active') {
      return NextResponse.json({
        success: false,
        error: `Account is ${userProfile.account_status}`,
        status: userProfile.account_status,
        email,
      }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      created,
      user: buildUserResponse(authUser, userProfile),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: 'OAuth completion failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
