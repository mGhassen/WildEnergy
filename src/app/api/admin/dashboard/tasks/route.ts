import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function GET(req: NextRequest) {
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

    // Fetch accounts pending approval
    const { data: pendingAccounts, error: accountsError } = await supabaseServer()
      .from('user_profiles')
      .select('account_id, email, first_name, last_name, created_at')
      .eq('account_status', 'pending')
      .order('created_at', { ascending: false });

    if (accountsError) {
      console.error('Error fetching pending accounts:', accountsError);
      return NextResponse.json({ error: 'Failed to fetch pending accounts' }, { status: 500 });
    }

    // Fetch courses that need to start checking (scheduled courses starting soon)
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
    const today = now.toISOString().split('T')[0];
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const { data: upcomingCourses, error: coursesError } = await supabaseServer()
      .from('courses')
      .select(`
        id,
        course_date,
        start_time,
        end_time,
        status,
        max_participants,
        current_participants,
        class:classes(
          id,
          name,
          category:categories(name, color)
        ),
        trainer:trainers(
          id,
          member:members(first_name, last_name)
        )
      `)
      .in('status', ['scheduled'])
      .gte('course_date', today)
      .lte('course_date', tomorrow)
      .order('course_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (coursesError) {
      console.error('Error fetching upcoming courses:', coursesError);
      return NextResponse.json({ error: 'Failed to fetch upcoming courses' }, { status: 500 });
    }

    // Filter courses that are starting within the next hour or are overdue
    const coursesNeedingCheck = (upcomingCourses || []).filter((course: any) => {
      const courseDateTime = new Date(`${course.course_date}T${course.start_time}`);
      const timeDiff = courseDateTime.getTime() - now.getTime();
      const hoursUntilStart = timeDiff / (1000 * 60 * 60);
      
      // Include courses starting within 1 hour or overdue
      return hoursUntilStart <= 1 && hoursUntilStart >= -2; // Allow 2 hours grace period for overdue
    });

    return NextResponse.json({
      pendingAccounts: {
        count: pendingAccounts?.length || 0,
        accounts: pendingAccounts || []
      },
      coursesNeedingCheck: {
        count: coursesNeedingCheck.length,
        courses: coursesNeedingCheck
      }
    });

  } catch (error: any) {
    console.error('Dashboard tasks error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
