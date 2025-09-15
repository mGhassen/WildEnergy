import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

async function getUserFromToken(token: string) {
  const { data: { user }, error } = await supabaseServer().auth.getUser(token);
  if (error || !user) return null;
  const { data: userProfile } = await supabaseServer()
    .from('user_profiles')
    .select('account_id, is_admin')
    .eq('account_id', user.id)
    .single();
  return userProfile;
}

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
    
    const userProfile = await getUserFromToken(token);
    if (!userProfile) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    // Check if user is admin
    if (!userProfile.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    const memberId = id;
    
    if (!memberId) {
      return NextResponse.json({ error: 'Member ID is required' }, { status: 400 });
    }

    // Call the stored procedure to increment guest count
    const { data: result, error: procedureError } = await supabaseServer()
      .rpc('increment_member_guest_count', {
        p_member_id: memberId
      });

    if (procedureError) {
      console.error('Error incrementing guest count:', procedureError);
      return NextResponse.json({ error: 'Failed to increment guest count' }, { status: 500 });
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to increment guest count' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Guest count incremented successfully',
      member_id: result.member_id,
      guest_count: result.guest_count
    });

  } catch (error) {
    console.error('POST increment guest count error:', error);
    return NextResponse.json({ error: 'Failed to increment guest count' }, { status: 500 });
  }
}

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
    
    const userProfile = await getUserFromToken(token);
    if (!userProfile) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    // Check if user is admin
    if (!userProfile.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    const memberId = id;
    
    if (!memberId) {
      return NextResponse.json({ error: 'Member ID is required' }, { status: 400 });
    }

    // Call the stored procedure to get guest count
    const { data: result, error: procedureError } = await supabaseServer()
      .rpc('get_member_guest_count', {
        p_member_id: memberId
      });

    if (procedureError) {
      console.error('Error getting guest count:', procedureError);
      return NextResponse.json({ error: 'Failed to get guest count' }, { status: 500 });
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to get guest count' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      member_id: result.member_id,
      guest_count: result.guest_count
    });

  } catch (error) {
    console.error('GET guest count error:', error);
    return NextResponse.json({ error: 'Failed to get guest count' }, { status: 500 });
  }
}
