import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

function extractIdFromUrl(request: NextRequest): string | null {
  const match = request.nextUrl.pathname.match(/\/trainers\/(.+?)\/unlink-account/);
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

    // Check if trainer exists and get current account link
    const { data: trainer, error: trainerError } = await supabaseServer()
      .from('trainers')
      .select('id, account_id')
      .eq('id', trainerId)
      .single();

    if (trainerError || !trainer) {
      return NextResponse.json({ error: 'Trainer not found' }, { status: 404 });
    }

    if (!trainer.account_id) {
      return NextResponse.json({ 
        error: 'Trainer is not linked to any account',
        details: 'No account link found for this trainer'
      }, { status: 400 });
    }

    // Unlink account from trainer
    const { error: unlinkError } = await supabaseServer()
      .from('trainers')
      .update({ account_id: null })
      .eq('id', trainerId);

    if (unlinkError) {
      console.error('Error unlinking account from trainer:', unlinkError);
      return NextResponse.json({ error: 'Failed to unlink account from trainer', details: unlinkError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Account unlinked from trainer successfully',
      trainer: {
        id: trainer.id,
        account_id: null
      }
    });
  } catch (e) {
    console.error('Internal server error:', e);
    return NextResponse.json({ error: 'Internal server error', details: String(e) }, { status: 500 });
  }
}
