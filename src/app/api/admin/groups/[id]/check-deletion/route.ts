import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
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
      .select('is_admin')
      .eq('email', adminUser.email)
      .single();

    if (!adminCheck?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await context.params;

    // Check if group is used in any plans
    const { data: linkedPlans, error: plansError } = await supabaseServer()
      .from('plan_groups')
      .select(`
        id,
        plans (
          id,
          name
        )
      `)
      .eq('group_id', id);

    if (plansError) {
      return NextResponse.json({ error: 'Failed to check linked plans' }, { status: 500 });
    }

    // If group is used in plans, return canDelete: false with linked plans
    if (linkedPlans && linkedPlans.length > 0) {
      const planNames = linkedPlans.map((pg: any) => pg.plans?.name).filter(Boolean);
      return NextResponse.json({ 
        canDelete: false,
        linkedPlans: planNames
      });
    }

    // Group can be deleted
    return NextResponse.json({ 
      canDelete: true,
      linkedPlans: []
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}