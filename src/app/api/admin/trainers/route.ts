import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }
    // Verify user (member or admin) using new user system
    const { data: { user }, error: authError } = await supabaseServer().auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
    
    // Fetch all trainers from new user system
    const { data: trainers, error } = await supabaseServer()
      .from('user_profiles')
      .select('*')
      .not('trainer_id', 'is', null) // Only users with trainer records
      .eq('trainer_status', 'active')
      .order('first_name', { ascending: true });
      
    if (error) {
      console.error('Error fetching trainers:', error);
      return NextResponse.json({ error: 'Failed to fetch trainers', details: error }, { status: 500 });
    }
    
    // Format trainers data for frontend compatibility
    const trainersFlat = (trainers ?? []).map((trainer) => ({
      id: trainer.trainer_id,
      account_id: trainer.account_id,
      specialization: trainer.specialization,
      experience_years: trainer.experience_years,
      bio: trainer.bio,
      certification: trainer.certification,
      hourly_rate: trainer.hourly_rate,
      status: trainer.trainer_status ?? "",
      first_name: trainer.first_name ?? "",
      last_name: trainer.last_name ?? "",
      email: trainer.email ?? "",
      phone: trainer.phone ?? "",
      user_type: trainer.user_type,
      accessible_portals: trainer.accessible_portals
    }));
    
    return NextResponse.json(trainersFlat);
  } catch (e) {
    console.error('Internal server error:', e);
    return NextResponse.json({ error: 'Internal server error', details: String(e) }, { status: 500 });
  }
}

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
    
    const { firstName, lastName, email, phone, specialization, experienceYears, bio, certification, hourlyRate } = await req.json();
    
    if (!firstName || !lastName || !email) {
      return NextResponse.json({ error: 'First name, last name, and email are required' }, { status: 400 });
    }
    
    // Create auth user with random password
    const password = Math.random().toString(36).slice(2) + Math.random().toString(36).toUpperCase().slice(2);
    const { data: authUser, error: userError } = await supabaseServer().auth.admin.createUser({
      email,
      password,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        phone
      },
      email_confirm: true,
    });
    
    if (userError || !authUser.user) {
      return NextResponse.json({ error: userError?.message || 'Failed to create trainer user' }, { status: 400 });
    }
    
    const authUserId = authUser.user.id;
    
    try {
      // Create account record
      const { data: account, error: accountError } = await supabaseServer()
        .from('accounts')
        .insert({
          id: authUserId,
          email,
          status: 'active',
          is_admin: false,
        })
        .select()
        .single();
      
      if (accountError) {
        throw new Error(`Failed to create account: ${accountError.message}`);
      }
      
      // Create profile record
      const { data: profile, error: profileError } = await supabaseServer()
        .from('profiles')
        .insert({
          id: authUserId,
          first_name: firstName,
          last_name: lastName,
          phone: phone || null,
        })
        .select()
        .single();
      
      if (profileError) {
        throw new Error(`Failed to create profile: ${profileError.message}`);
      }
      
      // Create trainer record
      const { data: trainer, error: trainerError } = await supabaseServer()
        .from('trainers')
        .insert({
          account_id: authUserId,
          profile_id: authUserId,
          specialization: specialization || '',
          experience_years: experienceYears || 0,
          bio: bio || '',
          certification: certification || '',
          hourly_rate: hourlyRate || 0,
          status: 'active',
        })
        .select()
        .single();
      
      if (trainerError) {
        throw new Error(`Failed to create trainer record: ${trainerError.message}`);
      }
      
      // Return the complete trainer profile
      const { data: trainerProfile, error: trainerProfileError } = await supabaseServer()
        .from('user_profiles')
        .select('*')
        .eq('account_id', authUserId)
        .single();
      
      if (trainerProfileError) {
        throw new Error(`Failed to fetch trainer profile: ${trainerProfileError.message}`);
      }
      
      return NextResponse.json({ success: true, trainer: trainerProfile });
      
    } catch (error: any) {
      // Cleanup: delete auth user if database operations failed
      await supabaseServer().auth.admin.deleteUser(authUserId).catch(() => {});
      return NextResponse.json({ error: error.message || 'Failed to create trainer' }, { status: 400 });
    }
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create trainer' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
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
    
    const body = await req.json();
    const { 
      trainerId, 
      accountId, 
      firstName, 
      lastName, 
      email, 
      phone, 
      specialization, 
      experienceYears, 
      bio, 
      certification, 
      hourlyRate, 
      status 
    } = body;
    
    console.log('[PUT /api/trainers] Received:', body);
    
    let profileUpdateError = null;
    let accountUpdateError = null;
    let trainerUpdateError = null;
    
    // Update profile table
    const profileUpdates: any = {};
    if (firstName !== undefined) profileUpdates.first_name = firstName;
    if (lastName !== undefined) profileUpdates.last_name = lastName;
    if (phone !== undefined) profileUpdates.phone = phone;
    
    if (Object.keys(profileUpdates).length > 0 && accountId) {
      const { error: pErr } = await supabaseServer()
        .from('profiles')
        .update(profileUpdates)
        .eq('id', accountId);
      if (pErr) {
        profileUpdateError = pErr;
        console.error('[PUT /api/trainers] Profile update error:', pErr);
      }
    }
    
    // Update account table
    const accountUpdates: any = {};
    if (email !== undefined) accountUpdates.email = email;
    
    if (Object.keys(accountUpdates).length > 0 && accountId) {
      const { error: aErr } = await supabaseServer()
        .from('accounts')
        .update(accountUpdates)
        .eq('id', accountId);
      if (aErr) {
        accountUpdateError = aErr;
        console.error('[PUT /api/trainers] Account update error:', aErr);
      }
    }
    
    // Update trainers table
    const trainerUpdates: any = {};
    if (specialization !== undefined) trainerUpdates.specialization = specialization;
    if (experienceYears !== undefined) trainerUpdates.experience_years = experienceYears;
    if (bio !== undefined) trainerUpdates.bio = bio;
    if (certification !== undefined) trainerUpdates.certification = certification;
    if (hourlyRate !== undefined) trainerUpdates.hourly_rate = hourlyRate;
    if (status !== undefined) trainerUpdates.status = status;
    
    if (Object.keys(trainerUpdates).length > 0 && trainerId) {
      const { error: tErr } = await supabaseServer()
        .from('trainers')
        .update(trainerUpdates)
        .eq('id', trainerId);
      if (tErr) {
        trainerUpdateError = tErr;
        console.error('[PUT /api/trainers] Trainer update error:', tErr);
      }
    }
    
    if (profileUpdateError || accountUpdateError || trainerUpdateError) {
      return NextResponse.json({ 
        error: 'Failed to update trainer', 
        profileUpdateError, 
        accountUpdateError, 
        trainerUpdateError 
      }, { status: 500 });
    }
    
    // Fetch updated trainer profile
    const { data: trainerProfile, error: fetchError } = await supabaseServer()
      .from('user_profiles')
      .select('*')
      .eq('trainer_id', trainerId)
      .single();
      
    if (fetchError || !trainerProfile) {
      console.error('[PUT /api/trainers] Fetch error:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch updated trainer', details: fetchError }, { status: 500 });
    }
    
    // Format for frontend compatibility
    const trainerFlat = {
      id: trainerProfile.trainer_id,
      account_id: trainerProfile.account_id,
      specialization: trainerProfile.specialization,
      experience_years: trainerProfile.experience_years,
      bio: trainerProfile.bio,
      certification: trainerProfile.certification,
      hourly_rate: trainerProfile.hourly_rate,
      status: trainerProfile.trainer_status ?? "",
      first_name: trainerProfile.first_name ?? "",
      last_name: trainerProfile.last_name ?? "",
      email: trainerProfile.email ?? "",
      phone: trainerProfile.phone ?? "",
      user_type: trainerProfile.user_type,
      accessible_portals: trainerProfile.accessible_portals
    };
    
    return NextResponse.json({ success: true, trainer: trainerFlat });
  } catch (e) {
    console.error('[PUT /api/trainers] Exception:', e);
    return NextResponse.json({ error: 'Failed to update trainer', details: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
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
    
    const { accountId } = await req.json();
    console.log('[DELETE /api/trainers] Received accountId:', accountId);
    
    // Delete from Supabase Auth (this will cascade to account, which will cascade to trainer table)
    const { error: deleteAuthError } = await supabaseServer().auth.admin.deleteUser(accountId);
    if (deleteAuthError) {
      console.error('[DELETE /api/trainers] Auth delete error:', deleteAuthError);
      return NextResponse.json({ 
        error: 'Failed to delete trainer from authentication', 
        details: deleteAuthError.message 
      }, { status: 500 });
    }
    
    console.log('[DELETE /api/trainers] Successfully deleted trainer and cascaded to database');
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[DELETE /api/trainers] Exception:', e);
    return NextResponse.json({ error: 'Failed to delete trainer', details: String(e) }, { status: 500 });
  }
} 