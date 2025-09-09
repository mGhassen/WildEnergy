import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
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

    const { memberId, courseId } = await req.json();

    if (!memberId || !courseId) {
      return NextResponse.json({ error: 'Member ID and Course ID are required' }, { status: 400 });
    }

    // Get the course's group information
    const { data: course, error: courseError } = await supabaseServer()
      .from('courses')
      .select(`
        id,
        class:classes(
          category:categories(
            group:groups(
              id,
              name,
              color
            )
          )
        )
      `)
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const classData = Array.isArray(course.class) ? course.class[0] : course.class;
    const categoryData = Array.isArray(classData?.category) ? classData.category[0] : classData?.category;
    const groupData = Array.isArray(categoryData?.group) ? categoryData.group[0] : categoryData?.group;
    const groupId = groupData?.id;
    if (!groupId) {
      return NextResponse.json({ 
        can_register: false, 
        error: 'Course group not found' 
      });
    }

    // Get member's active subscription and group sessions
    const { data: memberData, error: memberError } = await supabaseServer()
      .from('user_profiles')
      .select(`
        id,
        first_name,
        last_name,
        subscriptions!inner(
          id,
          status,
          end_date,
          subscription_group_sessions(
            id,
            group_id,
            sessions_remaining,
            total_sessions,
            groups(
              id,
              name,
              color
            )
          )
        )
      `)
      .eq('id', memberId)
      .eq('subscriptions.status', 'active')
      .gt('subscriptions.end_date', 'NOW()')
      .single();

    if (memberError || !memberData) {
      return NextResponse.json({ 
        can_register: false, 
        error: 'Member not found or no active subscription' 
      });
    }

    // Find the group session for this course's group
    const groupSession = memberData.subscriptions?.[0]?.subscription_group_sessions?.find(
      (gs: any) => gs.group_id === groupId
    );

    if (!groupSession) {
      return NextResponse.json({ 
        can_register: false, 
        error: 'No group sessions allocated for this course type',
        group_name: groupData?.name
      });
    }

    const remainingSessions = groupSession.sessions_remaining || 0;
    const totalSessions = groupSession.total_sessions || 0;

    return NextResponse.json({
      can_register: remainingSessions > 0,
      remaining_sessions: remainingSessions,
      total_sessions: totalSessions,
      group_name: (Array.isArray(groupSession.groups) ? groupSession.groups[0] : groupSession.groups)?.name || groupData?.name,
      group_color: (Array.isArray(groupSession.groups) ? groupSession.groups[0] : groupSession.groups)?.color || groupData?.color,
      error: remainingSessions <= 0 ? 'No remaining sessions for this group' : null
    });

  } catch (error) {
    console.error('Error checking member sessions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
