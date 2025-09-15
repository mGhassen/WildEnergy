import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer, createSupabaseClient } from '@/lib/supabase';
import { editCourseSchema } from '@/shared/zod-schemas';

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

    // Verify user (member or admin)
    const { data: { user }, error: authError } = await supabaseServer().auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const { id } = await params;
    const courseId = parseInt(id);
    if (isNaN(courseId)) {
      return NextResponse.json({ error: 'Invalid course ID' }, { status: 400 });
    }

    // Fetch course with comprehensive related data including schedule for comparison
    const { data: course, error } = await supabaseServer()
      .from('courses')
      .select(`
        *,
        class:classes(
          id, 
          name, 
          description, 
          duration, 
          max_capacity, 
          equipment,
          difficulty,
          is_active,
          category:categories(
            id,
            name,
            color,
            category_groups(
              group:groups(
                id,
                name,
                color
              )
            )
          )
        ),
        trainer:trainers(
          id,
          account_id,
          specialization,
          experience_years,
          bio,
          certification,
          status
        ),
        schedule:schedules(
          id,
          class_id,
          trainer_id,
          day_of_week,
          start_time,
          end_time,
          max_participants,
          repetition_type,
          schedule_date,
          start_date,
          end_date,
          is_active
        )
      `)
      .eq('id', courseId)
      .single();

    if (error) {
      console.error('Course fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch course' }, { status: 500 });
    }

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // Fetch registrations for this course
    const { data: registrations, error: regError } = await supabaseServer()
      .from('class_registrations')
      .select(`
        id,
        registration_date,
        status,
        notes,
        qr_code,
        member_id
      `)
      .eq('course_id', course.id);

    if (regError) {
      console.error('Registrations fetch error:', regError);
    }

    // Fetch check-ins for this course (through registrations)
    const { data: checkins, error: checkinError } = await supabaseServer()
      .from('checkins')
      .select(`
        id,
        checkin_time,
        registration_id,
        member_id
      `)
      .in('registration_id', registrations?.map(r => r.id) || []);

    if (checkinError) {
      console.error('Check-ins fetch error:', checkinError);
    }

    // Fetch trainer details from user_profiles
    let trainerDetails = null;
    if (course.trainer?.account_id) {
      const { data: trainerData } = await supabaseServer()
        .from('user_profiles')
        .select('first_name, last_name, email, phone')
        .eq('account_id', course.trainer.account_id)
        .single();
      
      if (trainerData) {
        trainerDetails = {
          ...course.trainer,
          first_name: trainerData.first_name,
          last_name: trainerData.last_name,
          email: trainerData.email,
          phone: trainerData.phone
        };
      }
    }

    // Fetch member details for registrations and checkins
    const registrationMemberIds = registrations?.map(r => r.member_id).filter(Boolean) || [];
    const checkinMemberIds = checkins?.map(c => c.member_id).filter(Boolean) || [];
    const allMemberIds = [...new Set([...registrationMemberIds, ...checkinMemberIds])];
    
    let memberDetails: Record<string, any> = {};
    if (allMemberIds.length > 0) {
      const { data: members } = await supabaseServer()
        .from('user_profiles')
        .select('member_id, first_name, last_name, email, phone')
        .in('member_id', allMemberIds);
      
      if (members) {
        members.forEach(member => {
          memberDetails[member.member_id] = member;
        });
      }
    }

    // Calculate attendance statistics
    const totalRegistrations = registrations?.length || 0;
    const totalCheckins = checkins?.length || 0;
    const attendanceRate = totalRegistrations > 0 ? Math.round((totalCheckins / totalRegistrations) * 100) : 0;

    // Process class data to include group information
    let processedClass = course.class;
    if (processedClass?.category?.category_groups) {
      const categoryGroups = processedClass.category.category_groups;
      const firstGroup = categoryGroups.length > 0 ? categoryGroups[0].group : null;
      processedClass = {
        ...processedClass,
        category: {
          ...processedClass.category,
          group: firstGroup
        }
      };
    }

    // Calculate if course has been edited compared to schedule
    const schedule = course.schedule;
    
    // Debug logging to understand the data structure
    console.log('Individual Course data:', {
      id: course.id,
      trainer_id: course.trainer_id,
      start_time: course.start_time,
      end_time: course.end_time,
      max_participants: course.max_participants
    });
    
    console.log('Individual Schedule data:', schedule ? {
      id: schedule.id,
      trainer_id: schedule.trainer_id,
      start_time: schedule.start_time,
      end_time: schedule.end_time,
      max_participants: schedule.max_participants
    } : 'No schedule');
    
    const isEdited = schedule ? (
      course.trainer_id !== schedule.trainer_id ||
      course.start_time !== schedule.start_time ||
      course.end_time !== schedule.end_time ||
      course.max_participants !== schedule.max_participants
    ) : false;
    
    console.log('Individual Is edited:', isEdited);

    // Fetch trainer details for both original and current trainers if they differ
    let originalTrainerDetails = null;
    let currentTrainerDetails = null;
    
    if (schedule && course.trainer_id !== schedule.trainer_id) {
      // Fetch original trainer details
      if (schedule.trainer_id) {
        const { data: originalTrainer } = await supabaseServer()
          .from('trainers')
          .select(`
            id,
            account_id,
            specialization,
            experience_years,
            bio,
            certification,
            status
          `)
          .eq('id', schedule.trainer_id)
          .single();
        
        if (originalTrainer?.account_id) {
          const { data: originalTrainerUser } = await supabaseServer()
            .from('user_profiles')
            .select('first_name, last_name, email, phone')
            .eq('account_id', originalTrainer.account_id)
            .single();
          
          if (originalTrainerUser) {
            originalTrainerDetails = {
              ...originalTrainer,
              first_name: originalTrainerUser.first_name,
              last_name: originalTrainerUser.last_name,
              email: originalTrainerUser.email,
              phone: originalTrainerUser.phone
            };
          }
        }
      }
      
      // Current trainer details are already fetched above
      currentTrainerDetails = trainerDetails;
    }

    const differences = schedule ? {
      trainer: course.trainer_id !== schedule.trainer_id ? {
        original: originalTrainerDetails,
        current: currentTrainerDetails
      } : null,
      startTime: course.start_time !== schedule.start_time ? {
        original: schedule.start_time,
        current: course.start_time
      } : null,
      endTime: course.end_time !== schedule.end_time ? {
        original: schedule.end_time,
        current: course.end_time
      } : null,
      maxParticipants: course.max_participants !== schedule.max_participants ? {
        original: schedule.max_participants,
        current: course.max_participants
      } : null
    } : null;

    // Return comprehensive course data
    return NextResponse.json({
      ...course,
      class: processedClass,
      trainer: {
        ...(trainerDetails || course.trainer),
        member: trainerDetails ? {
          id: course.trainer?.account_id,
          first_name: trainerDetails.first_name,
          last_name: trainerDetails.last_name,
          email: trainerDetails.email,
          phone: trainerDetails.phone
        } : null
      },
      registrations: (registrations || []).map(reg => ({
        ...reg,
        member: memberDetails[reg.member_id] ? {
          ...memberDetails[reg.member_id],
          id: memberDetails[reg.member_id].member_id
        } : {
          id: reg.member_id,
          first_name: 'Unknown',
          last_name: 'Member',
          email: 'unknown@example.com',
          phone: null
        }
      })),
      checkins: (checkins || []).map(checkin => ({
        ...checkin,
        member: memberDetails[checkin.member_id] ? {
          ...memberDetails[checkin.member_id],
          id: memberDetails[checkin.member_id].member_id
        } : {
          id: checkin.member_id,
          first_name: 'Unknown',
          last_name: 'Member',
          email: 'unknown@example.com'
        }
      })),
      statistics: {
        totalRegistrations,
        totalCheckins,
        attendanceRate,
        availableSpots: course.max_participants - totalRegistrations
      },
      isEdited,
      differences
    });

  } catch (error) {
    console.error('Course API exception:', error);
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 });
  }
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

    // Verify user is admin
    const { data: { user }, error: authError } = await supabaseServer().auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabaseServer()
      .from('user_profiles')
      .select('is_admin')
      .eq('email', user.email)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    const courseId = parseInt(id);
    if (isNaN(courseId)) {
      return NextResponse.json({ error: 'Invalid course ID' }, { status: 400 });
    }

    const { memberIds, groupSelections = {} } = await req.json();
    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      return NextResponse.json({ error: 'Member IDs are required' }, { status: 400 });
    }

    // Check if course exists and get capacity info
    const { data: course, error: courseError } = await supabaseServer()
      .from('courses')
      .select('id, max_participants, current_participants')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // Note: Admin registrations bypass capacity checks
    // Admins can register members even when course is at capacity
    const availableSpots = course.max_participants - course.current_participants;
    if (memberIds.length > availableSpots) {
      console.log(`Admin registration: Course capacity exceeded. Available spots: ${availableSpots}, trying to add: ${memberIds.length}. Proceeding with admin override.`);
    }

    // Check which members are already registered
    const { data: existingRegistrations } = await supabaseServer()
      .from('class_registrations')
      .select('member_id')
      .eq('course_id', courseId)
      .in('member_id', memberIds)
      .eq('status', 'registered');

    const alreadyRegistered = existingRegistrations?.map(r => r.member_id) || [];
    const newMemberIds = memberIds.filter(id => !alreadyRegistered.includes(id));

    if (newMemberIds.length === 0) {
      return NextResponse.json({ 
        error: 'All selected members are already registered for this course' 
      }, { status: 400 });
    }

    // Register members using the stored procedure to properly handle session tracking
    const registrationResults = [];
    const errors = [];

    for (const memberId of newMemberIds) {
      try {
        const isGuestRegistration = groupSelections[memberId] === -1;
        
        if (isGuestRegistration) {
          // Guest registration - create registration without session deduction
          const { data: registration, error: registrationError } = await supabaseServer()
            .from('class_registrations')
            .insert({
              member_id: memberId,
              course_id: courseId,
              status: 'registered',
              registration_date: new Date().toISOString(),
              qr_code: `${Date.now()}-${memberId}-${courseId}`, // Simple QR code generation
              notes: 'Guest registration (no subscription sessions used)'
            })
            .select()
            .single();

          if (registrationError) {
            console.error('Guest registration error for member:', memberId, registrationError);
            errors.push({
              memberId,
              error: 'Failed to create guest registration'
            });
            continue;
          }

          // Increment guest count for the member
          const { error: guestCountError } = await supabaseServer()
            .rpc('increment_member_guest_count', {
              p_member_id: memberId
            });

          if (guestCountError) {
            console.error('Failed to increment guest count for member:', memberId, guestCountError);
            // Don't fail the registration, just log the error
          }

          // Update course participant count for guest registration
          const { error: updateError } = await supabaseServer()
            .from('courses')
            .update({ 
              current_participants: course.current_participants + registrationResults.length + 1 
            })
            .eq('id', courseId);

          if (updateError) {
            console.error('Failed to update course participant count:', updateError);
          }

          registrationResults.push({
            memberId,
            registration,
            success: true,
            type: 'guest'
          });

        } else {
          // Regular registration with subscription
          // Get member's active subscription
          const { data: activeSubscription } = await supabaseServer()
            .from('subscriptions')
            .select('id')
            .eq('member_id', memberId)
            .eq('status', 'active')
            .order('end_date', { ascending: false })
            .limit(1)
            .single();

          if (!activeSubscription) {
            errors.push({
              memberId,
              error: 'No active subscription found'
            });
            continue;
          }

          // Use the stored procedure to handle registration with session deduction
          const { data: result, error: procedureError } = await supabaseServer()
            .rpc('create_registration_with_updates', {
              p_user_id: memberId,
              p_course_id: courseId,
              p_current_participants: course.current_participants + registrationResults.length,
              p_subscription_id: activeSubscription.id,
              p_group_id: groupSelections[memberId] || null
            }) as { data: any; error: any };

          if (procedureError) {
            console.error('Registration procedure error for member:', memberId, procedureError);
            errors.push({
              memberId,
              error: 'Failed to create registration'
            });
            continue;
          }

          registrationResults.push({
            memberId,
            registration: result,
            success: true,
            type: 'subscription'
          });
        }

      } catch (error) {
        console.error('Error registering member:', memberId, error);
        errors.push({
          memberId,
          error: 'Registration failed'
        });
      }
    }

    // Return results
    const successfulRegistrations = registrationResults.length;
    const failedRegistrations = errors.length;
    const guestRegistrations = registrationResults.filter(r => r.type === 'guest').length;
    const subscriptionRegistrations = registrationResults.filter(r => r.type === 'subscription').length;
    
    let message = `Successfully registered ${successfulRegistrations} members`;
    if (guestRegistrations > 0 && subscriptionRegistrations > 0) {
      message += ` (${subscriptionRegistrations} using subscription, ${guestRegistrations} as guests)`;
    } else if (guestRegistrations > 0) {
      message += ` as guests`;
    } else if (subscriptionRegistrations > 0) {
      message += ` using subscriptions`;
    }
    
    if (alreadyRegistered.length > 0) {
      message += ` (${alreadyRegistered.length} were already registered)`;
    }
    if (failedRegistrations > 0) {
      message += ` (${failedRegistrations} failed)`;
    }
    
    return NextResponse.json({ 
      success: true, 
      registered: successfulRegistrations,
      alreadyRegistered: alreadyRegistered.length,
      failed: failedRegistrations,
      guestRegistrations,
      subscriptionRegistrations,
      message,
      errors: errors,
      registrations: registrationResults
    });

  } catch (error) {
    console.error('Course member addition error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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

    const { id } = await params;
    const courseId = parseInt(id);
    if (isNaN(courseId)) {
      return NextResponse.json({ error: 'Invalid course ID' }, { status: 400 });
    }

    const updateData = await req.json();
    
    // Validate the update data
    const validationResult = editCourseSchema.safeParse(updateData);
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: validationResult.error.issues 
      }, { status: 400 });
    }
    
    // Use the validated data directly (already in snake_case)
    const allowedUpdates = validationResult.data;

    const { data: course, error } = await supabaseServer()
      .from('courses')
      .update({
        ...allowedUpdates,
        updated_at: new Date().toISOString()
      })
      .eq('id', courseId)
      .select('*')
      .single();

    if (error) {
      console.error('Course update error:', error);
      return NextResponse.json({ error: 'Failed to update course' }, { status: 500 });
    }

    return NextResponse.json({ success: true, course });

  } catch (error) {
    console.error('Course update exception:', error);
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 });
  }
}

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

    const { id } = await params;
    const courseId = parseInt(id);
    if (isNaN(courseId)) {
      return NextResponse.json({ error: 'Invalid course ID' }, { status: 400 });
    }

    // Check if course has registrations or check-ins
    const { data: registrations } = await supabaseServer()
      .from('class_registrations')
      .select('id')
      .eq('course_id', courseId);

    const { data: checkins } = await supabaseServer()
      .from('checkins')
      .select(`
        id,
        registration_id,
        class_registrations!inner(course_id)
      `)
      .eq('class_registrations.course_id', courseId);

    if ((registrations?.length || 0) > 0 || (checkins?.length || 0) > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete course with existing registrations or check-ins' 
      }, { status: 400 });
    }

    const { error } = await supabaseServer()
      .from('courses')
      .delete()
      .eq('id', courseId);

    if (error) {
      console.error('Course deletion error:', error);
      return NextResponse.json({ error: 'Failed to delete course' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Course deletion exception:', error);
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 });
  }
}