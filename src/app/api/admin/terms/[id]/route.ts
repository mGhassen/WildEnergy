import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

// GET - Fetch specific terms version
export async function GET(
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

    const { data: terms, error } = await supabaseServer()
      .from('terms_and_conditions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching terms:', error);
      return NextResponse.json({ error: 'Failed to fetch terms' }, { status: 500 });
    }

    if (!terms) {
      return NextResponse.json({ error: 'Terms not found' }, { status: 404 });
    }

    return NextResponse.json(terms);
  } catch (error) {
    console.error('Admin terms GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update terms version
export async function PUT(
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
    const { version, title, content, is_active, term_type = 'terms' } = await req.json();

    if (!version || !title || !content) {
      return NextResponse.json({ error: 'Version, title, and content are required' }, { status: 400 });
    }

    // Validate term_type
    if (!['terms', 'interior_regulation'].includes(term_type)) {
      return NextResponse.json({ error: 'Invalid term_type. Must be "terms" or "interior_regulation"' }, { status: 400 });
    }

    // If activating this version, deactivate all others of the same type first
    if (is_active) {
      await supabaseServer()
        .from('terms_and_conditions')
        .update({ is_active: false })
        .eq('term_type', term_type)
        .neq('id', id);
    }

    // Update terms version
    const { data: updatedTerms, error } = await supabaseServer()
      .from('terms_and_conditions')
      .update({
        version,
        title,
        content,
        term_type,
        is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating terms:', error);
      return NextResponse.json({ error: 'Failed to update terms' }, { status: 500 });
    }

    return NextResponse.json(updatedTerms);
  } catch (error) {
    console.error('Admin terms PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete terms version
export async function DELETE(
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

    // Check if this is the active version
    const { data: terms, error: fetchError } = await supabaseServer()
      .from('terms_and_conditions')
      .select('is_active')
      .eq('id', id)
      .single();

    if (fetchError || !terms) {
      return NextResponse.json({ error: 'Terms not found' }, { status: 404 });
    }

    if (terms.is_active) {
      return NextResponse.json({ 
        error: 'Cannot delete active terms version. Please activate another version first.' 
      }, { status: 400 });
    }

    // Delete terms version
    const { error } = await supabaseServer()
      .from('terms_and_conditions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting terms:', error);
      return NextResponse.json({ error: 'Failed to delete terms' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Terms deleted successfully' });
  } catch (error) {
    console.error('Admin terms DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
