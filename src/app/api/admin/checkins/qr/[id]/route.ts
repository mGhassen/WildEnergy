import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 1. Get the session token from Authorization header (primary) or cookies (fallback)
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '') || request.cookies.get('sb-access-token')?.value;

  console.log('Check-in QR API - Auth header:', authHeader ? 'present' : 'missing');
  console.log('Check-in QR API - Token:', token ? 'present' : 'missing');

  if (!token) {
    console.log('Check-in QR API - No token found');
    return NextResponse.json({ success: false, message: 'Unauthorized - No token provided' }, { status: 401 });
  }

  // 2. Validate the token and get the user using the server client
  console.log('Check-in QR API - Validating token...');
  const { data: { user }, error } = await supabaseServer().auth.getUser(token);

  if (error) {
    console.log('Check-in QR API - Token validation error:', error);
  }

  if (error || !user) {
    console.log('Check-in QR API - Invalid token or no user');
    return NextResponse.json({ success: false, message: 'Unauthorized - Invalid token' }, { status: 401 });
  }

  console.log('Check-in QR API - Token validated, user ID:', user.id);

  // 3. Check if the user is an admin
  console.log('Check-in QR API - Checking admin status for user:', user.id);
  const { data: profile, error: profileError } = await supabaseServer()
    .from('user_profiles')
    .select('is_admin')
    .eq('email', user.email)
    .single();

  if (profileError) {
    console.log('Check-in QR API - Profile error:', profileError);
  }

  if (!profile) {
    console.log('Check-in QR API - No profile found for user:', user.id);
    return NextResponse.json({ success: false, message: 'Forbidden - User profile not found' }, { status: 403 });
  }

  if (!profile.is_admin) {
    console.log('Check-in QR API - User is not admin:', user.id);
    return NextResponse.json({ success: false, message: 'Forbidden - Admin access required' }, { status: 403 });
  }

  console.log('Check-in QR API - Admin access confirmed for user:', user.id);

  try {
    const resolvedParams = await params;
    let qrCode = resolvedParams.id;
    
    // URL decode the QR code in case it was encoded
    try {
      qrCode = decodeURIComponent(qrCode);
    } catch (e) {
      console.log('Check-in QR API - URL decode failed, using original:', e);
    }
    
    console.log('Check-in QR API - Looking for QR code:', qrCode);
    console.log('Check-in QR API - QR code type:', typeof qrCode);
    console.log('Check-in QR API - QR code length:', qrCode?.length);
    console.log('Check-in QR API - QR code trimmed:', qrCode?.trim());
    console.log('Check-in QR API - QR code JSON:', JSON.stringify(qrCode));

    // Find the registration by QR code
    console.log('Check-in QR API - Querying class_registrations table...');
    const { data: registration, error: regError } = await supabaseServer()
      .from('class_registrations')
      .select(`
        id,
        status,
        registration_date,
        member_id,
        course_id,
        qr_code,
        courses (
          id,
          course_date,
          start_time,
          end_time,
          class_id,
          trainer_id
        )
      `)
      .eq('qr_code', qrCode)
      .single();

    if (regError) {
      console.log('Check-in QR API - Registration query error:', regError);
    }

    if (!registration) {
      console.log('Check-in QR API - No registration found for QR code:', qrCode);
      
      // Let's also check what QR codes exist in the database
      const { data: allQrCodes, error: qrError } = await supabaseServer()
        .from('class_registrations')
        .select('qr_code, id, member_id')
        .not('qr_code', 'is', null);
      
      if (qrError) {
        console.log('Check-in QR API - Error fetching all QR codes:', qrError);
      } else {
        console.log('Check-in QR API - Available QR codes in database:', allQrCodes?.map(r => ({ qr_code: r.qr_code, id: r.id, member_id: r.member_id })));
        console.log('Check-in QR API - Searching for exact match...');
        allQrCodes?.forEach(r => {
          console.log(`Check-in QR API - DB QR: "${r.qr_code}" (type: ${typeof r.qr_code}, length: ${r.qr_code?.length})`);
          console.log(`Check-in QR API - Match check: "${r.qr_code}" === "${qrCode}" = ${r.qr_code === qrCode}`);
        });
      }
      
      return NextResponse.json(
        { success: false, message: 'QR code not found or invalid' },
        { status: 404 }
      );
    }

    console.log('Check-in QR API - Registration found:', registration.id);

    // Fetch member data separately
    const { data: memberData, error: memberError } = await supabaseServer()
      .from('members')
      .select(`
        id,
        status,
        profiles!inner (
          first_name,
          last_name,
          profile_email,
          phone
        )
      `)
      .eq('id', registration.member_id)
      .single();

    if (memberError) {
      console.log('Check-in QR API - Member query error:', memberError);
    }

    if (!memberData) {
      console.log('Check-in QR API - No member found for member_id:', registration.member_id);
      return NextResponse.json({ 
        success: false, 
        message: 'Member not found' 
      }, { status: 404 });
    }

    // --- FIX: Handle both array and object for registration.courses ---
    const courseObj = Array.isArray(registration.courses) ? registration.courses[0] : registration.courses;
    console.log('courseObj:', courseObj);

    // Get class information (with max_capacity, category, difficulty)
    const { data: classInfo } = await supabaseServer()
      .from('classes')
      .select('id, name, max_capacity, category_id, difficulty, category:category_id (id, name)')
      .eq('id', courseObj?.class_id)
      .single();
    console.log('classInfo:', classInfo);

    // Get trainer information
    const { data: trainerInfo } = await supabaseServer()
      .from('trainers')
      .select(`
        id,
        specialization,
        experience_years,
        bio,
        certification,
        hourly_rate,
        status,
        profiles (
          first_name,
          last_name,
          phone
        )
      `)
      .eq('id', courseObj?.trainer_id)
      .single();

    // Get member's active subscription info with group sessions
    console.log('Check-in QR API - Looking for subscription for member_id:', registration.member_id);
    const { data: activeSubscription, error: subError } = await supabaseServer()
      .from('subscriptions')
      .select(`
        id, 
        plan_id, 
        status, 
        start_date,
        end_date,
        plans (
          name,
          description,
          price
        ),
        subscription_group_sessions (
          group_id,
          sessions_remaining,
          total_sessions,
          groups (
            name
          )
        )
      `)
      .eq('member_id', registration.member_id)
      .eq('status', 'active')
      .order('end_date', { ascending: false })
      .limit(1)
      .single();

    if (subError) {
      console.log('Check-in QR API - Subscription query error:', subError);
    } else {
      console.log('Check-in QR API - Subscription found:', activeSubscription);
    }

    // Get registered and checked-in counts for this course (excluding cancelled)
    const { data: courseRegistrations } = await supabaseServer()
      .from('class_registrations')
      .select('id, member_id, status')
      .eq('course_id', courseObj.id)
      .neq('status', 'cancelled');

    // Get all check-ins for this course to determine who has checked in
    const { data: allCourseCheckins } = await supabaseServer()
      .from('checkins')
      .select('registration_id')
      .in('registration_id', courseRegistrations?.map(r => r.id) || []);

    // Count check-ins
    const checkedInCount = (allCourseCheckins || []).length;

    // Always use max_capacity from classInfo for maxCapacity
    const maxCapacity = classInfo?.max_capacity ?? null;

    // Get all registered members for this course (all statuses except cancelled: registered, attended, absent)
    console.log('Check-in QR API - Debug: Querying for course_id:', courseObj.id);
    const { data: allCourseMembers, error: membersError } = await supabaseServer()
      .from('class_registrations')
      .select(`
        id,
        members (
          id,
          status,
          account_id,
          profiles (
            first_name,
            last_name,
            phone
          ),
          accounts (
            email
          )
        ),
        status
      `)
      .eq('course_id', courseObj.id)
      .neq('status', 'cancelled');
    
    if (membersError) {
      console.log('Check-in QR API - Debug: Error fetching members:', membersError);
    } else {
      console.log('Check-in QR API - Debug: Members query result:', allCourseMembers?.length, 'members found');
      console.log('Check-in QR API - Debug: Member statuses:', allCourseMembers?.map(m => ({ id: m.id, status: m.status })));
    }

    const checkedInIds = new Set((allCourseCheckins || []).map(c => c.registration_id));

    // Count only registrations that are registered AND not checked in
    const registeredCount = (courseRegistrations?.filter(r => 
      r.status === 'registered' && !checkedInIds.has(r.id)
    ) || []).length;

    // Build unified list with all members and their actual statuses
    const unifiedMembers = (allCourseMembers || []).map((r: any) => {
      let displayStatus = r.status;
      
      // If member has checked in, show as 'attended' (not 'checked_in')
      if (checkedInIds.has(r.id)) {
        displayStatus = 'attended';
      }
      
      return {
        id: r.members?.id,
        first_name: r.members?.profiles?.first_name,
        last_name: r.members?.profiles?.last_name,
        email: r.members?.accounts?.email,
        phone: r.members?.profiles?.phone,
        status: displayStatus
      };
    });

    // Calculate total non-canceled members
    const totalMembers = (allCourseMembers || []).length;
    console.log('Check-in QR API - Debug: allCourseMembers length:', allCourseMembers?.length);
    console.log('Check-in QR API - Debug: totalMembers calculated:', totalMembers);
    console.log('Check-in QR API - Debug: courseObj.id used for query:', courseObj.id);

    // Get all checked-in members for this course
    const { data: attendantMembers } = await supabaseServer()
      .from('checkins')
      .select(`
        class_registrations!inner (
          members (
            id,
            status,
            account_id,
            profiles (
              first_name,
              last_name,
              phone
            ),
            accounts (
              email
            )
          )
        )
      `)
      .eq('class_registrations.course_id', courseObj.id);

    // Check if this member is already checked in
    const { data: existingCheckin } = await supabaseServer()
      .from('checkins')
      .select('id')
      .eq('registration_id', registration.id)
      .single();

    // Calculate alreadyCheckedIn
    const alreadyCheckedIn = !!existingCheckin;

    const checkinInfo = {
      member: {
        id: memberData.id,
        first_name: memberData.profiles?.first_name,
        last_name: memberData.profiles?.last_name,
        email: memberData.profiles?.profile_email,
        phone: memberData.profiles?.phone,
        status: memberData.status,
        activeSubscription: activeSubscription ? {
          id: activeSubscription.id,
          planName: (activeSubscription.plans as any)?.name,
          planDescription: (activeSubscription.plans as any)?.description,
          planPrice: (activeSubscription.plans as any)?.price,
          planSessionCount: (() => {
            // Calculate total sessions from all group sessions
            const groupSessions = (activeSubscription as any)?.subscription_group_sessions || [];
            return groupSessions.reduce((total: number, group: any) => total + (group.total_sessions || 0), 0);
          })(),
          status: activeSubscription.status,
          sessionsRemaining: (() => {
            // Calculate total remaining sessions from all group sessions
            const groupSessions = (activeSubscription as any)?.subscription_group_sessions || [];
            return groupSessions.reduce((total: number, group: any) => total + (group.sessions_remaining || 0), 0);
          })(),
          startDate: activeSubscription.start_date,
          endDate: activeSubscription.end_date,
          groupSessions: (activeSubscription as any)?.subscription_group_sessions || []
        } : null
      },
      course: {
        ...registration.courses,
        class: {
          ...classInfo,
          category: (() => {
            if (Array.isArray(classInfo?.category)) {
              if (classInfo.category.length > 0 && typeof classInfo.category[0]?.name === 'string') {
                return classInfo.category[0].name;
              }
            } else if (classInfo?.category && typeof classInfo.category === 'object' && 'name' in classInfo.category) {
              return (classInfo.category as any)?.name;
            } else if (typeof classInfo?.category === 'string') {
              return classInfo.category;
            }
            return '-';
          })(),
          maxCapacity: classInfo?.max_capacity ?? null,
        },
        trainer: {
          id: trainerInfo?.id,
          first_name: trainerInfo?.profiles?.[0]?.first_name,
          last_name: trainerInfo?.profiles?.[0]?.last_name,
          phone: trainerInfo?.profiles?.[0]?.phone,
          specialization: trainerInfo?.specialization,
          experience_years: trainerInfo?.experience_years,
          bio: trainerInfo?.bio,
          certification: trainerInfo?.certification,
          hourly_rate: trainerInfo?.hourly_rate,
          status: trainerInfo?.status
        },
        maxCapacity,
      },
      registration: {
        id: registration.id,
        status: registration.status,
        registeredAt: registration.registration_date
      },
      registeredCount,
      checkedInCount,
      maxCapacity,
      alreadyCheckedIn,
      totalMembers,
      members: unifiedMembers,
      attendantMembers: Array.isArray(attendantMembers)
        ? attendantMembers.flatMap(c =>
            Array.isArray(c.class_registrations)
              ? c.class_registrations.map(reg => ({
                  id: reg.members?.[0]?.id,
                  first_name: reg.members?.[0]?.profiles?.[0]?.first_name,
                  last_name: reg.members?.[0]?.profiles?.[0]?.last_name,
                  email: reg.members?.[0]?.accounts?.[0]?.email,
                  phone: reg.members?.[0]?.profiles?.[0]?.phone
                }))
              : []
          )
        : []
    };

    console.log('Check-in QR API - Debug: Final response totalMembers:', checkinInfo.totalMembers);
    console.log('Check-in QR API - Debug: Final response members length:', checkinInfo.members?.length);
    
    return NextResponse.json({
      success: true,
      data: checkinInfo
    });

  } catch (error) {
    console.error('QR check-in info error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
} 