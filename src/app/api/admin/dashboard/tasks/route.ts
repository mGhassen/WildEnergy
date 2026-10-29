import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import {
  batchResolveTrainerProfiles,
  enrichTrainerWithProfile,
} from '@/lib/resolve-trainer-profile';

const BIRTHDAY_WINDOW_DAYS = 7;

function startOfLocalDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Birthday in ±window days (past or upcoming), daysUntil (neg = past), age on that day. */
function birthdayWindowInfo(dateOfBirth: string, asOf: Date) {
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;

  const today = startOfLocalDay(asOf);
  const birthMonth = dob.getMonth();
  const birthDay = dob.getDate();
  const y = today.getFullYear();

  let best: { daysUntil: number; ageTurning: number } | null = null;
  for (const year of [y - 1, y, y + 1]) {
    const occurrence = new Date(year, birthMonth, birthDay);
    const daysUntil = Math.round(
      (occurrence.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysUntil < -BIRTHDAY_WINDOW_DAYS || daysUntil > BIRTHDAY_WINDOW_DAYS) continue;
    const ageTurning = year - dob.getFullYear();
    if (!best || Math.abs(daysUntil) < Math.abs(best.daysUntil)) {
      best = { daysUntil, ageTurning };
    }
  }

  if (!best) return null;
  return { ...best, dateOfBirth: dateOfBirth.slice(0, 10) };
}

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

    const sb = supabaseServer();
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const [
      { data: pendingAccounts, error: accountsError },
      { data: upcomingCourses, error: coursesError },
      { data: profilesWithDob, error: profilesError },
      { data: membersRows, error: membersError },
      { data: trainersRows, error: trainersError },
    ] = await Promise.all([
      sb
        .from('accounts')
        .select(`
          id,
          email,
          created_at,
          profiles!inner(
            first_name,
            last_name
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
      sb
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
            account_id,
            profile_id,
            specialization,
            experience_years,
            bio,
            certification,
            status
          )
        `)
        .in('status', ['scheduled'])
        .gte('course_date', today)
        .lte('course_date', tomorrow)
        .order('course_date', { ascending: true })
        .order('start_time', { ascending: true }),
      sb
        .from('profiles')
        .select('id, first_name, last_name, date_of_birth')
        .not('date_of_birth', 'is', null),
      sb.from('members').select('id, profile_id'),
      sb.from('trainers').select('id, profile_id'),
    ]);

    if (accountsError) {
      console.error('Error fetching pending accounts:', accountsError);
      return NextResponse.json({ error: 'Failed to fetch pending accounts' }, { status: 500 });
    }

    if (coursesError) {
      console.error('Error fetching upcoming courses:', coursesError);
      return NextResponse.json({ error: 'Failed to fetch upcoming courses' }, { status: 500 });
    }

    if (profilesError) {
      console.error('Error fetching profiles for birthdays:', profilesError);
      return NextResponse.json({ error: 'Failed to fetch upcoming birthdays' }, { status: 500 });
    }

    if (membersError) {
      console.error('Error fetching members for birthdays:', membersError);
      return NextResponse.json({ error: 'Failed to fetch upcoming birthdays' }, { status: 500 });
    }

    if (trainersError) {
      console.error('Error fetching trainers for birthdays:', trainersError);
      return NextResponse.json({ error: 'Failed to fetch upcoming birthdays' }, { status: 500 });
    }

    const normalizeTrainer = (trainer: unknown) =>
      Array.isArray(trainer) ? trainer[0] : trainer;

    const trainerProfiles = await batchResolveTrainerProfiles(
      sb,
      (upcomingCourses || []).map((course) => normalizeTrainer(course.trainer)),
    );

    const enrichedUpcomingCourses = (upcomingCourses || []).map((course) => ({
      ...course,
      trainer: enrichTrainerWithProfile(normalizeTrainer(course.trainer), trainerProfiles),
    }));

    // Filter courses that are starting within the next hour or are overdue
    const coursesNeedingCheck = enrichedUpcomingCourses.filter((course: any) => {
      const courseDateTime = new Date(`${course.course_date}T${course.start_time}`);
      const timeDiff = courseDateTime.getTime() - now.getTime();
      const hoursUntilStart = timeDiff / (1000 * 60 * 60);
      
      // Include courses starting within 1 hour or overdue
      return hoursUntilStart <= 1 && hoursUntilStart >= -2; // Allow 2 hours grace period for overdue
    });

    // Flatten the nested profile data for pending accounts
    const flattenedPendingAccounts = (pendingAccounts || []).map((account: any) => ({
      account_id: account.id,
      email: account.email,
      first_name: account.profiles?.first_name || '',
      last_name: account.profiles?.last_name || '',
      created_at: account.created_at
    }));

    const memberByProfile = new Map<string, string>();
    for (const m of membersRows || []) {
      if (m.profile_id) memberByProfile.set(m.profile_id, m.id);
    }
    const trainerByProfile = new Map<string, string>();
    for (const t of trainersRows || []) {
      if (t.profile_id) trainerByProfile.set(t.profile_id, t.id);
    }

    const upcomingBirthdays = (profilesWithDob || [])
      .map((profile) => {
        const info = birthdayWindowInfo(profile.date_of_birth, now);
        if (!info) return null;

        const memberId = memberByProfile.get(profile.id);
        const trainerId = trainerByProfile.get(profile.id);
        const href = memberId
          ? `/admin/members/${memberId}`
          : trainerId
            ? `/admin/trainers/${trainerId}`
            : `/admin/accounts/${profile.id}`;

        return {
          profileId: profile.id,
          firstName: profile.first_name || '',
          lastName: profile.last_name || '',
          dateOfBirth: info.dateOfBirth,
          daysUntil: info.daysUntil,
          ageTurning: info.ageTurning,
          href,
        };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null)
      .sort((a, b) => {
        // Past first (most recent), then today, then upcoming
        if (a.daysUntil !== b.daysUntil) return a.daysUntil - b.daysUntil;
        const nameA = `${a.firstName} ${a.lastName}`.trim().toLowerCase();
        const nameB = `${b.firstName} ${b.lastName}`.trim().toLowerCase();
        return nameA.localeCompare(nameB);
      });

    return NextResponse.json({
      pendingAccounts: {
        count: flattenedPendingAccounts.length,
        accounts: flattenedPendingAccounts
      },
      coursesNeedingCheck: {
        count: coursesNeedingCheck.length,
        courses: coursesNeedingCheck
      },
      upcomingBirthdays: {
        count: upcomingBirthdays.length,
        people: upcomingBirthdays,
      },
    });

  } catch (error: any) {
    console.error('Dashboard tasks error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
