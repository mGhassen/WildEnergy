import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

function extractIdFromUrl(request: NextRequest): string | null {
  const match = request.nextUrl.pathname.match(/\/accounts\/(.+?)\/link-trainer/);
  return match ? match[1] : null;
}

async function verifyAdminAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  
  if (!token) {
    return { error: NextResponse.json({ error: 'No token provided' }, { status: 401 }) };
  }

  const { data: { user: adminUser }, error: authError } = await supabaseServer().auth.getUser(token);
  if (authError || !adminUser) {
    return { error: NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 }) };
  }

  const { data: adminCheck } = await supabaseServer()
    .from('user_profiles')
    .select('is_admin, accessible_portals')
    .eq('email', adminUser.email)
    .single();

  if (!adminCheck?.is_admin || !adminCheck?.accessible_portals?.includes('admin')) {
    return { error: NextResponse.json({ error: 'Admin access required' }, { status: 403 }) };
  }

  return { adminUser };
}

export async function POST(request: NextRequest) {
  try {
    const accountId = extractIdFromUrl(request);
    if (!accountId) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
    }

    const { trainerId } = await request.json();
    if (!trainerId) {
      return NextResponse.json({ error: 'Trainer ID is required' }, { status: 400 });
    }

    // Verify admin authentication
    const authResult = await verifyAdminAuth(request);
    if (authResult.error) return authResult.error;

    // Check if account exists
    const { data: account, error: accountError } = await supabaseServer()
      .from('accounts')
      .select('*')
      .eq('id', accountId)
      .single();

    if (accountError || !account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 400 });
    }

    // Check if trainer exists
    const { data: trainer, error: trainerError } = await supabaseServer()
      .from('trainers')
      .select('*')
      .eq('id', trainerId)
      .single();

    if (trainerError || !trainer) {
      return NextResponse.json({ error: 'Trainer not found' }, { status: 400 });
    }

    // Check if account is already linked to a trainer
    const { data: existingTrainer } = await supabaseServer()
      .from('trainers')
      .select('id')
      .eq('account_id', accountId)
      .single();

    if (existingTrainer) {
      return NextResponse.json({ error: 'Account is already linked to a trainer' }, { status: 400 });
    }

    // Check if trainer already has an account
    if (trainer.account_id) {
      return NextResponse.json({ error: 'Trainer is already linked to an account' }, { status: 400 });
    }

    // Same person = same profile. Reject mismatched profiles instead of silently forking identity.
    if (
      trainer.profile_id &&
      account.profile_id &&
      trainer.profile_id !== account.profile_id
    ) {
      return NextResponse.json(
        {
          error:
            'Trainer and account belong to different profiles. Link only when they are the same person.',
        },
        { status: 400 },
      );
    }

    const updates: { account_id: string; profile_id?: string } = {
      account_id: accountId,
    };
    // If trainer has no profile yet, inherit the account's person.
    if (!trainer.profile_id && account.profile_id) {
      updates.profile_id = account.profile_id;
    }

    const { error: linkError } = await supabaseServer()
      .from('trainers')
      .update(updates)
      .eq('id', trainerId);

    if (linkError) {
      return NextResponse.json({ error: 'Failed to link account to trainer' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Account linked to trainer successfully'
    });
  } catch (error) {
    console.error('Link trainer error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
