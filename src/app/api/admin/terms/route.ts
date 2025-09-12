import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

// GET - Fetch all terms versions
export async function GET(req: NextRequest) {
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

    // Fetch all terms versions ordered by creation date (newest first)
    const { data: terms, error } = await supabaseServer()
      .from('terms_and_conditions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching terms:', error);
      return NextResponse.json({ error: 'Failed to fetch terms' }, { status: 500 });
    }

    return NextResponse.json(terms);
  } catch (error) {
    console.error('Admin terms GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new terms version
export async function POST(req: NextRequest) {
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

    const { version, title, content, is_active = false, term_type = 'terms' } = await req.json();

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
        .eq('term_type', term_type);
    }

    // Create new terms version
    const { data: newTerms, error } = await supabaseServer()
      .from('terms_and_conditions')
      .insert({
        version,
        title,
        content,
        term_type,
        is_active,
        effective_date: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating terms:', error);
      return NextResponse.json({ error: 'Failed to create terms' }, { status: 500 });
    }

    return NextResponse.json(newTerms, { status: 201 });
  } catch (error) {
    console.error('Admin terms POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
