import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { z } from 'zod';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const { memberId } = await params;

    if (!memberId) {
      return NextResponse.json({ error: 'Member ID is required' }, { status: 400 });
    }

    // Check authentication
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    // Verify user (member)
    const { data: { user }, error: authError } = await supabaseServer().auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    // Get profile data through member relationship
    const { data: profile, error } = await supabaseServer()
      .from('members')
      .select(`
        account_id,
        profile_id,
        profiles!inner(
          id,
          first_name,
          last_name,
          phone,
          profile_email,
          date_of_birth,
          address,
          profession,
          emergency_contact_name,
          emergency_contact_phone,
          profile_image_url,
          created_at,
          updated_at
        )
      `)
      .eq('id', memberId)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const profileData = Array.isArray(profile.profiles) ? profile.profiles[0] : profile.profiles;
    
    return NextResponse.json({
      profile_id: profileData.id,
      account_id: profile.account_id,
      ...profileData,
      created_at: profileData?.created_at || new Date().toISOString(),
      updated_at: profileData?.updated_at || new Date().toISOString()
    });
  } catch (error) {
    console.error('Profile API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Validation schema for profile update
const updateProfileSchema = z.object({
  first_name: z.string().min(1, 'First name is required').optional(),
  last_name: z.string().min(1, 'Last name is required').optional(),
  phone: z.string().optional(),
  profile_email: z.string().email('Invalid email format').optional(),
  date_of_birth: z.string().optional(),
  address: z.string().optional(),
  profession: z.string().optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
  profile_image_url: z.string().url('Invalid URL format').optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const { memberId } = await params;
    const body = await request.json();

    if (!memberId) {
      return NextResponse.json({ error: 'Member ID is required' }, { status: 400 });
    }

    // Validate request body
    const validationResult = updateProfileSchema.safeParse(body);
    if (!validationResult.success) {
      console.error('Profile update validation error:', validationResult.error);
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: validationResult.error.issues 
      }, { status: 400 });
    }

    // Check authentication
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    // Verify user (member)
    const { data: { user }, error: authError } = await supabaseServer().auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    // Get profile_id from member
    const { data: member, error: memberError } = await supabaseServer()
      .from('members')
      .select('profile_id')
      .eq('id', memberId)
      .single();

    if (memberError || !member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Update profile data
    const updateData = {
      first_name: body.first_name,
      last_name: body.last_name,
      phone: body.phone === "" ? null : body.phone,
      profile_email: body.profile_email === "" ? null : body.profile_email,
      date_of_birth: body.date_of_birth === "" ? null : body.date_of_birth,
      address: body.address === "" ? null : body.address,
      profession: body.profession === "" ? null : body.profession,
      emergency_contact_name: body.emergency_contact_name === "" ? null : body.emergency_contact_name,
      emergency_contact_phone: body.emergency_contact_phone === "" ? null : body.emergency_contact_phone,
      profile_image_url: body.profile_image_url === "" ? null : body.profile_image_url,
      updated_at: new Date().toISOString()
    };

    console.log('Updating profile with data:', updateData);
    console.log('Profile ID:', member.profile_id);

    const { data: profile, error } = await supabaseServer()
      .from('profiles')
      .update(updateData)
      .eq('id', member.profile_id)
      .select()
      .single();

    if (error) {
      console.error('Error updating profile:', error);
      console.error('Profile ID:', member.profile_id);
      console.error('Update data:', updateData);
      return NextResponse.json({ 
        error: 'Failed to update profile', 
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error('Profile update API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
