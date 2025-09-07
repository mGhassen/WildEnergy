import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

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
      .from('users')
      .select('is_admin')
      .eq('auth_user_id', adminUser.id)
      .single();
    // Fetch all subscriptions with group sessions
    const { data: subscriptions, error } = await supabaseServer()
      .from('subscriptions')
      .select(`
        *,
        subscription_group_sessions(
          id,
          group_id,
          sessions_remaining,
          total_sessions,
          groups(
            id,
            name,
            description,
            color
          )
        )
      `)
      .order('created_at', { ascending: false });
    if (error) {
      return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 });
    }
    return NextResponse.json(subscriptions);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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
      .from('users')
      .select('is_admin')
      .eq('auth_user_id', adminUser.id)
      .single();
    if (!adminCheck?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    
    const subData = await req.json();
    console.log('Creating subscription with data:', subData);
    
    // Convert camelCase to snake_case for database
    const dbData: Record<string, any> = {
      user_id: subData.userId || subData.user_id,
      plan_id: subData.planId || subData.plan_id,
      start_date: subData.startDate || subData.start_date,
      end_date: subData.endDate || subData.end_date,
      status: subData.status || 'pending',
      notes: subData.notes
    };
    
    console.log('Converted to database format:', dbData);
    
    // Validate required fields
    const requiredFields = ['user_id', 'plan_id', 'start_date', 'end_date'];
    const missingFields = requiredFields.filter(field => !dbData[field]);
    
    if (missingFields.length > 0) {
      return NextResponse.json({ 
        error: 'Missing required fields', 
        missingFields 
      }, { status: 400 });
    }
    
    // Validate data types
    if (typeof dbData.user_id !== 'string') {
      return NextResponse.json({ 
        error: 'user_id must be a string (UUID)' 
      }, { status: 400 });
    }
    
    if (typeof dbData.plan_id !== 'number') {
      // Convert string to number if needed
      const planId = parseInt(dbData.plan_id);
      if (isNaN(planId)) {
        return NextResponse.json({ 
          error: 'plan_id must be a valid number' 
        }, { status: 400 });
      }
      dbData.plan_id = planId;
    }
    
    
    // Validate dates
    const startDate = new Date(dbData.start_date);
    const endDate = new Date(dbData.end_date);
    
    if (isNaN(startDate.getTime())) {
      return NextResponse.json({ 
        error: 'start_date must be a valid date' 
      }, { status: 400 });
    }
    
    if (isNaN(endDate.getTime())) {
      return NextResponse.json({ 
        error: 'end_date must be a valid date' 
      }, { status: 400 });
    }
    
    if (endDate <= startDate) {
      return NextResponse.json({ 
        error: 'end_date must be after start_date' 
      }, { status: 400 });
    }
    
    const { data: subscription, error } = await supabaseServer()
      .from('subscriptions')
      .insert(dbData)
      .select('*')
      .single();
      
    if (error) {
      console.error('Supabase error creating subscription:', error);
      return NextResponse.json({ 
        error: 'Failed to create subscription', 
        details: error.message 
      }, { status: 500 });
    }
    
    // Initialize group sessions for this subscription
    const { error: groupSessionsError } = await supabaseServer()
      .rpc('initialize_subscription_group_sessions', {
        p_subscription_id: subscription.id,
        p_plan_id: subscription.plan_id
      });
    
    if (groupSessionsError) {
      console.error('Error initializing group sessions:', groupSessionsError);
      // Don't fail the subscription creation, just log the error
      // This allows backward compatibility with plans that don't have groups
    }
    
    return NextResponse.json({ success: true, subscription });
  } catch (error) {
    console.error('Unexpected error in POST /api/subscriptions:', error);
    return NextResponse.json({ 
      error: 'Failed to create subscription',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
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
      .from('users')
      .select('is_admin')
      .eq('auth_user_id', adminUser.id)
      .single();
    if (!adminCheck?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    const { id, ...updates } = await req.json();
    const { data: subscription, error } = await supabaseServer()
      .from('subscriptions')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();
    if (error) {
      return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
    }
    return NextResponse.json({ success: true, subscription });
  } catch {
    return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
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
      .from('users')
      .select('is_admin')
      .eq('auth_user_id', adminUser.id)
      .single();
    if (!adminCheck?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    const { id } = await req.json();
    const { error } = await supabaseServer()
      .from('subscriptions')
      .delete()
      .eq('id', id);
    if (error) {
      return NextResponse.json({ error: 'Failed to delete subscription' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete subscription' }, { status: 500 });
  }
} 