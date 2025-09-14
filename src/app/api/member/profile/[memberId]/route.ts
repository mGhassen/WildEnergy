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

    // First check if member exists and has a profile_id
    console.log('Fetching profile for member ID:', memberId);
    
    const { data: member, error: memberError } = await supabaseServer()
      .from('members')
      .select('id, account_id, profile_id')
      .eq('id', memberId)
      .single();

    if (memberError) {
      console.error('Error fetching member:', memberError);
      console.error('Member ID:', memberId);
      console.error('Error code:', memberError.code);
      console.error('Error message:', memberError.message);
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    if (!member) {
      console.error('Member not found for ID:', memberId);
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    if (!member.profile_id) {
      console.error('Member has no profile_id:', memberId);
      return NextResponse.json({ error: 'Member profile not linked' }, { status: 404 });
    }

    // Now get the profile data
    const { data: profile, error: profileError } = await supabaseServer()
      .from('profiles')
      .select(`
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
      `)
      .eq('id', member.profile_id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      console.error('Profile ID:', member.profile_id);
      console.error('Error code:', profileError.code);
      console.error('Error message:', profileError.message);
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json({
      profile_id: profile.id,
      account_id: member.account_id,
      ...profile,
      created_at: profile?.created_at || new Date().toISOString(),
      updated_at: profile?.updated_at || new Date().toISOString()
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
