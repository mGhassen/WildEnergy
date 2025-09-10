import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

function extractIdFromUrl(request: NextRequest): string | null {
  const match = request.nextUrl.pathname.match(/\/trainers\/(.+?)\/link-account/);
  return match ? match[1] : null;
}

export async function POST(request: NextRequest) {
  try {
    const trainerId = extractIdFromUrl(request);
    if (!trainerId) {
      return NextResponse.json({ error: 'Trainer ID is required' }, { status: 400 });
    }

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    // Verify admin using new user system
    const { data: { user: adminUser }, error: authError } = await supabaseServer().auth.getUser(token);
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

    const { accountId } = await req.json();
    if (!accountId) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
    }

    // Check if trainer exists
    const { data: trainer, error: trainerError } = await supabaseServer()
      .from('trainers')
      .select('*')
      .eq('id', trainerId)
      .single();

    if (trainerError || !trainer) {
      return NextResponse.json({ error: 'Trainer not found' }, { status: 404 });
    }

    // Check if account exists
    const { data: account, error: accountError } = await supabaseServer()
      .from('accounts')
      .select('*')
      .eq('id', accountId)
      .single();

    if (accountError || !account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Check if account is already linked to a trainer
    const { data: existingTrainer, error: existingError } = await supabaseServer()
      .from('trainers')
      .select('id')
      .eq('account_id', accountId)
      .single();

    if (existingError && existingError.code !== 'PGRST116') { // PGRST116 = no rows found
      return NextResponse.json({ error: 'Failed to check existing trainer link' }, { status: 500 });
    }

    if (existingTrainer) {
      return NextResponse.json({ 
        error: 'Account is already linked to a trainer',
        details: `Account is linked to trainer ${existingTrainer.id}`
      }, { status: 400 });
    }

    // Check if trainer already has an account
    if (trainer.account_id) {
      return NextResponse.json({ 
        error: 'Trainer is already linked to an account',
        details: `Trainer is linked to account ${trainer.account_id}`
      }, { status: 400 });
    }

    // Link account to trainer
    const { error: linkError } = await supabaseServer()
      .from('trainers')
      .update({ account_id: accountId })
      .eq('id', trainerId);

    if (linkError) {
      console.error('Error linking account to trainer:', linkError);
      return NextResponse.json({ error: 'Failed to link account to trainer', details: linkError.message }, { status: 500 });
    }

    // Fetch updated trainer data
    const { data: updatedTrainer, error: fetchError } = await supabaseServer()
      .from('user_profiles')
      .select('*')
      .eq('trainer_id', trainerId)
      .single();

    if (fetchError) {
      console.error('Error fetching updated trainer:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch updated trainer data' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Account linked to trainer successfully',
      trainer: {
        id: updatedTrainer.trainer_id,
        account_id: updatedTrainer.account_id,
        first_name: updatedTrainer.first_name,
        last_name: updatedTrainer.last_name,
        email: updatedTrainer.email
      }
    });
  } catch (e) {
    console.error('Internal server error:', e);
    return NextResponse.json({ error: 'Internal server error', details: String(e) }, { status: 500 });
  }
}
