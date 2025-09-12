import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

// POST - Activate specific terms version
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    // Verify admin
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

    const { id } = await params;

    // Get the term type of the term being activated
    const { data: termToActivate, error: fetchError } = await supabaseServer()
      .from('terms_and_conditions')
      .select('term_type')
      .eq('id', id)
      .single();

    if (fetchError || !termToActivate) {
      return NextResponse.json({ error: 'Terms not found' }, { status: 404 });
    }

    // Deactivate all other terms versions of the same type
    const { error: deactivateError } = await supabaseServer()
      .from('terms_and_conditions')
      .update({ is_active: false })
      .eq('term_type', termToActivate.term_type)
      .neq('id', id);

    if (deactivateError) {
      console.error('Error deactivating other terms:', deactivateError);
      return NextResponse.json({ error: 'Failed to deactivate other terms' }, { status: 500 });
    }

    // Then activate the selected terms version
    const { data: activatedTerms, error: activateError } = await supabaseServer()
      .from('terms_and_conditions')
      .update({ 
        is_active: true,
        effective_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (activateError) {
      console.error('Error activating terms:', activateError);
      return NextResponse.json({ error: 'Failed to activate terms' }, { status: 500 });
    }

    if (!activatedTerms) {
      return NextResponse.json({ error: 'Terms not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Terms activated successfully',
      terms: activatedTerms
    });
  } catch (error) {
    console.error('Admin terms activate error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
