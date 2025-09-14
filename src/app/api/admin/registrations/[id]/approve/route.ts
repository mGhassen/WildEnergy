import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

async function getUserFromToken(token: string) {
  const { data: { user }, error } = await supabaseServer().auth.getUser(token);
  if (error || !user) return null;
  
  const { data: profile } = await supabaseServer()
    .from('user_profiles')
    .select('is_admin, accessible_portals')
    .eq('email', user.email)
    .single();
  
  return profile;
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: registrationId } = await context.params;
    console.log('Approve registration API - Registration ID received:', registrationId);
    
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      console.log('Approve registration API - No token provided');
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }
    
    const userProfile = await getUserFromToken(token);
    if (!userProfile) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    // Verify admin access
    if (!userProfile.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const registrationIdNum = parseInt(registrationId);
    if (!registrationId || isNaN(registrationIdNum)) {
      return NextResponse.json({ error: 'Invalid registration ID' }, { status: 400 });
    }

    // Get the registration details
    const { data: registration, error: registrationError } = await supabaseServer()
      .from('class_registrations')
      .select(`
        *,
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
        courses (
          id,
          course_date,
          start_time,
          end_time,
          class_id,
          classes (
            name
          )
        )
      `)
      .eq('id', registrationIdNum)
      .single();

    if (registrationError || !registration) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
    }

    // Check if registration can be approved (only registered status can be approved)
    if (registration.status !== 'registered') {
      return NextResponse.json({ 
        error: `Registration cannot be approved. Current status: ${registration.status}` 
      }, { status: 400 });
    }

    // Update registration status to attended (approved)
    const { data: updatedRegistration, error: updateError } = await supabaseServer()
      .from('class_registrations')
      .update({ status: 'attended' })
      .eq('id', registrationIdNum)
      .select()
      .single();

    if (updateError) {
      console.error('Approve registration error:', updateError);
      return NextResponse.json({ 
        error: 'Failed to approve registration',
        details: updateError.message 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Registration approved successfully',
      registration: updatedRegistration
    });

  } catch (error: any) {
    console.error('Approve registration error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}
