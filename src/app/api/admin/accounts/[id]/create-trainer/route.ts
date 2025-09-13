import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

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
    const accountId = request.url.split('/').slice(-2, -1)[0];
    if (!accountId) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
    }

    const { 
      specialization, 
      experienceYears, 
      bio, 
      certification, 
      hourlyRate, 
      status 
    } = await request.json();

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
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Check if account already has a trainer
    const { data: existingTrainer } = await supabaseServer()
      .from('trainers')
      .select('id')
      .eq('account_id', accountId)
      .single();

    if (existingTrainer) {
      return NextResponse.json({ error: 'Account already has a trainer record' }, { status: 400 });
    }

    // Create trainer record
    const { data: trainer, error: trainerError } = await supabaseServer()
      .from('trainers')
      .insert({
        account_id: accountId,
        profile_id: account.profile_id, // Use the account's profile_id
        specialization: specialization || '',
        experience_years: experienceYears || 0,
        bio: bio || '',
        certification: certification || '',
        hourly_rate: hourlyRate || 0,
        status: status || 'active',
      })
      .select()
      .single();

    if (trainerError) {
      return NextResponse.json({ error: trainerError.message || 'Failed to create trainer record' }, { status: 500 });
    }

    // Return the updated account with trainer info
    const { data: updatedAccount, error: updatedAccountError } = await supabaseServer()
      .from('user_profiles')
      .select('*')
      .eq('account_id', accountId)
      .single();

    if (updatedAccountError) {
      return NextResponse.json({ error: 'Failed to fetch updated account' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Trainer created successfully',
      account: updatedAccount
    });

  } catch (error) {
    console.error('Create trainer error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
