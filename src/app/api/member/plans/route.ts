import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

async function getUserFromToken(token: string) {
  const { data: authData, error: authError } = await supabaseServer().auth.getUser(token);
  if (authError || !authData.user) {
    return null;
  }
  const { data: userProfile } = await supabaseServer()
    .from('user_profiles')
    .select('id, is_admin')
    .eq('account_id', authData.user.id)
    .single();
  return userProfile;
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const userProfile = await getUserFromToken(token);
    if (!userProfile) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    // Both members and admins can access member plans

    const { data: plans, error } = await supabaseServer()
      .from('plans')
      .select(`
        *,
        plan_groups (
          id,
          group_id,
          session_count,
          is_free,
          groups (
            id,
            name,
            description,
            color
          )
        )
      `)
      .eq('is_active', true)
      .order('price', { ascending: true });

    if (error) {
      console.error('Error fetching member plans:', error);
      return NextResponse.json({ error: 'Failed to fetch plans' }, { status: 500 });
    }

    return NextResponse.json(plans);
  } catch (error) {
    console.error('Member plans API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
