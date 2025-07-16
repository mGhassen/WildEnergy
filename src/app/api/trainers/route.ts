import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }
    // Verify admin
    const { data: { user: adminUser }, error: authError } = await supabaseServer.auth.getUser(token);
    if (authError || !adminUser) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
    const { data: adminCheck } = await supabaseServer
      .from('users')
      .select('is_admin')
      .eq('auth_user_id', adminUser.id)
      .single();
    if (!adminCheck?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    // Fetch all trainers from trainers table, join users for names
    const { data: trainers, error } = await supabaseServer
      .from('trainers')
      .select(`
        id,
        user_id,
        specialization,
        experience_years,
        bio,
        certification,
        status,
        users:user_id (
          first_name,
          last_name,
          email,
          phone
        )
      `)
      .order('id', { ascending: true });
    if (error) {
      return NextResponse.json({ error: 'Failed to fetch trainers', details: error }, { status: 500 });
    }
    // Flatten the joined user fields for frontend compatibility
    const trainersFlat = (trainers ?? []).map((trainer) => ({
      id: trainer.id,
      user_id: trainer.user_id,
      specialization: trainer.specialization,
      experience_years: trainer.experience_years,
      bio: trainer.bio,
      certification: trainer.certification,
      status: trainer.status ?? "",
      first_name: trainer.users?.first_name ?? "",
      last_name: trainer.users?.last_name ?? "",
      email: trainer.users?.email ?? "",
      phone: trainer.users?.phone ?? "",
    }));
    return NextResponse.json(trainersFlat);
  } catch (e) {
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
    // Verify admin
    const { data: { user: adminUser }, error: authError } = await supabaseServer.auth.getUser(token);
    if (authError || !adminUser) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
    const { data: adminCheck } = await supabaseServer
      .from('users')
      .select('is_admin')
      .eq('auth_user_id', adminUser.id)
      .single();
    if (!adminCheck?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    const { firstName, lastName, email, phone, status } = await req.json();
    if (!firstName || !lastName || !email) {
      return NextResponse.json({ error: 'First name, last name, and email are required' }, { status: 400 });
    }
    // Create auth user with random password
    const password = Math.random().toString(36).slice(2) + Math.random().toString(36).toUpperCase().slice(2);
    const { data: authUser, error: userError } = await supabaseServer.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        phone,
        is_trainer: true,
      },
      email_confirm: true,
    });
    if (userError || !authUser.user) {
      return NextResponse.json({ error: userError?.message || 'Failed to create trainer user' }, { status: 400 });
    }
    // Create user record in users table
    const { data: user, error: userCreateError } = await supabaseServer
      .from('users')
      .insert({
        auth_user_id: authUser.user.id,
        email,
        first_name: firstName,
        last_name: lastName,
        phone,
        is_member: false,
        is_trainer: true,
        status: status || 'active',
        subscription_status: 'inactive',
      })
      .select('*')
      .single();
    if (userCreateError || !user) {
      await supabaseServer.auth.admin.deleteUser(authUser.user.id).catch(() => {});
      return NextResponse.json({ error: userCreateError?.message || 'Failed to create user record' }, { status: 400 });
    }
    // Create trainer profile (optional, if you have a trainers table)
    // ...
    return NextResponse.json({ success: true, trainer: user });
  } catch {
    return NextResponse.json({ error: 'Failed to create trainer' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }
    // Verify admin
    const { data: { user: adminUser }, error: authError } = await supabaseServer.auth.getUser(token);
    if (authError || !adminUser) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
    const { data: adminCheck } = await supabaseServer
      .from('users')
      .select('is_admin')
      .eq('auth_user_id', adminUser.id)
      .single();
    if (!adminCheck?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    const body = await req.json();
    const { id, user_id, firstName, lastName, email, phone, status, specialization, experience_years, bio, certification } = body;
    console.log('[PUT /api/trainers] Received:', { id, user_id, firstName, lastName, email, phone, status, specialization, experience_years, bio, certification });
    // Update users table
    const userUpdates: any = {};
    if (firstName !== undefined) userUpdates.first_name = firstName;
    if (lastName !== undefined) userUpdates.last_name = lastName;
    if (email !== undefined) userUpdates.email = email;
    if (phone !== undefined) userUpdates.phone = phone;
    if (status !== undefined) userUpdates.status = status;
    let userUpdateError = null;
    if (Object.keys(userUpdates).length > 0 && user_id) {
      const { error: uErr } = await supabaseServer
        .from('users')
        .update(userUpdates)
        .eq('id', user_id);
      if (uErr) {
        userUpdateError = uErr;
        console.error('[PUT /api/trainers] User update error:', uErr);
      }
    }
    // Update trainers table
    const trainerUpdates: any = {};
    if (specialization !== undefined) trainerUpdates.specialization = specialization;
    if (experience_years !== undefined) trainerUpdates.experience_years = experience_years;
    if (bio !== undefined) trainerUpdates.bio = bio;
    if (certification !== undefined) trainerUpdates.certification = certification;
    if (status !== undefined) trainerUpdates.status = status;
    let trainerUpdateError = null;
    if (Object.keys(trainerUpdates).length > 0 && id) {
      const { error: tErr } = await supabaseServer
        .from('trainers')
        .update(trainerUpdates)
        .eq('id', id);
      if (tErr) {
        trainerUpdateError = tErr;
        console.error('[PUT /api/trainers] Trainer update error:', tErr);
      }
    }
    if (userUpdateError || trainerUpdateError) {
      return NextResponse.json({ error: 'Failed to update trainer', userUpdateError, trainerUpdateError }, { status: 500 });
    }
    // Fetch updated trainer with joined user info
    const { data: trainers, error: fetchError } = await supabaseServer
      .from('trainers')
      .select(`
        id,
        user_id,
        specialization,
        experience_years,
        bio,
        certification,
        status,
        users:user_id (
          first_name,
          last_name,
          email,
          phone
        )
      `)
      .eq('id', id)
      .single();
    if (fetchError || !trainers) {
      console.error('[PUT /api/trainers] Fetch error:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch updated trainer', details: fetchError }, { status: 500 });
    }
    // Flatten for frontend
    const trainerFlat = {
      id: trainers.id,
      user_id: trainers.user_id,
      specialization: trainers.specialization,
      experience_years: trainers.experience_years,
      bio: trainers.bio,
      certification: trainers.certification,
      status: trainers.status ?? "",
      first_name: trainers.users?.first_name ?? "",
      last_name: trainers.users?.last_name ?? "",
      email: trainers.users?.email ?? "",
      phone: trainers.users?.phone ?? "",
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
    // Verify admin
    const { data: { user: adminUser }, error: authError } = await supabaseServer.auth.getUser(token);
    if (authError || !adminUser) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
    const { data: adminCheck } = await supabaseServer
      .from('users')
      .select('is_admin')
      .eq('auth_user_id', adminUser.id)
      .single();
    if (!adminCheck?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    const { id } = await req.json();
    console.log('[DELETE /api/trainers] Received id:', id);
    // Delete from trainers table first to avoid FK constraint
    const { error: trainerDeleteError } = await supabaseServer
      .from('trainers')
      .delete()
      .eq('user_id', id);
    if (trainerDeleteError) {
      console.error('[DELETE /api/trainers] Trainers delete error:', trainerDeleteError);
      throw trainerDeleteError;
    }
    // Delete from users table
    const { error: deleteError } = await supabaseServer
      .from('users')
      .delete()
      .eq('id', id);
    if (deleteError) {
      console.error('[DELETE /api/trainers] Users delete error:', deleteError);
      throw deleteError;
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[DELETE /api/trainers] Exception:', e);
    return NextResponse.json({ error: 'Failed to delete trainer', details: String(e) }, { status: 500 });
  }
} 