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
    
    // Fetch all trainers from new user system (linked trainers)
    const { data: linkedTrainers, error: linkedError } = await supabaseServer()
      .from('user_profiles')
      .select('*')
      .not('trainer_id', 'is', null)
      .order('first_name', { ascending: true });
      
    if (linkedError) {
      console.error('Error fetching linked trainers:', linkedError);
      return NextResponse.json({ error: 'Failed to fetch trainers', details: linkedError }, { status: 500 });
    }

    // Fetch unlinked trainers directly from trainers table
    const { data: unlinkedTrainers, error: unlinkedError } = await supabaseServer()
      .from('trainers')
      .select('*')
      .is('account_id', null);

    if (unlinkedError) {
      console.error('Error fetching unlinked trainers:', unlinkedError);
      return NextResponse.json({ error: 'Failed to fetch unlinked trainers' }, { status: 500 });
    }

    // Fetch profiles for unlinked trainers
    const profileIds = unlinkedTrainers?.map(t => t.profile_id).filter(Boolean) || [];
    const { data: unlinkedProfiles, error: profilesError } = await supabaseServer()
      .from('profiles')
      .select('id, first_name, last_name, phone, profile_email')
      .in('id', profileIds);

    if (profilesError) {
      console.error('Error fetching unlinked profiles:', profilesError);
      return NextResponse.json({ error: 'Failed to fetch unlinked profiles' }, { status: 500 });
    }

    // Combine trainers with their profiles
    const unlinkedTrainersWithProfiles = unlinkedTrainers?.map(trainer => ({
      ...trainer,
      profiles: unlinkedProfiles?.find(p => p.id === trainer.profile_id) || null
    })) || [];

    // Format linked trainers data
    const linkedTrainersFlat = (linkedTrainers ?? []).map((trainer) => ({
      id: trainer.trainer_id,
      account_id: trainer.account_id,
      profile_id: trainer.profile_id ?? null,
      specialization: trainer.specialization,
      experience_years: trainer.experience_years,
      bio: trainer.bio,
      certification: trainer.certification,
      hourly_rate: trainer.hourly_rate,
      status: trainer.trainer_status ?? "",
      first_name: trainer.first_name ?? "",
      last_name: trainer.last_name ?? "",
      email: trainer.email ?? "",
      profile_email: trainer.profile_email ?? null,
      phone: trainer.phone ?? "",
      user_type: trainer.user_type,
      accessible_portals: trainer.accessible_portals,
      isUnlinked: false,
    }));

    // Format unlinked trainers data
    const unlinkedTrainersFlat = unlinkedTrainersWithProfiles.map((trainer) => ({
      id: trainer.id,
      account_id: null,
      profile_id: trainer.profile_id,
      specialization: trainer.specialization,
      experience_years: trainer.experience_years,
      bio: trainer.bio,
      certification: trainer.certification,
      hourly_rate: trainer.hourly_rate,
      status: trainer.status ?? "",
      first_name: trainer.profiles?.first_name ?? "Unknown",
      last_name: trainer.profiles?.last_name ?? "User",
      email: null,
      profile_email: trainer.profiles?.profile_email ?? null,
      phone: trainer.profiles?.phone ?? "",
      user_type: 'trainer',
      accessible_portals: ['trainer'],
      isUnlinked: true,
    }));

    // Combine both lists
    const allTrainers = [...linkedTrainersFlat, ...unlinkedTrainersFlat];
    
    // Sort by first name
    allTrainers.sort((a, b) => a.first_name.localeCompare(b.first_name));
    
    return NextResponse.json(allTrainers);
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
      profileId,
      firstName,
      lastName,
      phone,
      profileEmail,
      specialization,
      experienceYears,
      experience_years,
      bio,
      certification,
      hourlyRate,
      status,
    } = body;
    const resolvedExperienceYears = experienceYears ?? experience_years ?? 0;

    let profile: {
      id: string;
      first_name: string | null;
      last_name: string | null;
      phone: string | null;
      profile_email: string | null;
    } | null = null;
    let createdProfileId: string | null = null;

    if (profileId) {
      const { data: existingProfile, error: profileError } = await supabaseServer()
        .from('profiles')
        .select('id, first_name, last_name, phone, profile_email')
        .eq('id', profileId)
        .single();

      if (profileError || !existingProfile) {
        return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
      }

      const { data: existingTrainer } = await supabaseServer()
        .from('trainers')
        .select('id')
        .eq('profile_id', profileId)
        .maybeSingle();

      if (existingTrainer) {
        return NextResponse.json(
          { error: 'This person already has a trainer role' },
          { status: 400 },
        );
      }

      profile = existingProfile;
    } else {
      if (!firstName?.trim() || !lastName?.trim()) {
        return NextResponse.json(
          { error: 'First name and last name are required' },
          { status: 400 },
        );
      }

      const { data: newProfile, error: profileError } = await supabaseServer()
        .from('profiles')
        .insert({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone?.trim() || null,
          profile_email: profileEmail?.trim() || null,
        })
        .select('id, first_name, last_name, phone, profile_email')
        .single();

      if (profileError || !newProfile) {
        return NextResponse.json(
          { error: profileError?.message || 'Failed to create profile' },
          { status: 500 },
        );
      }

      profile = newProfile;
      createdProfileId = newProfile.id;
    }

    // Attach existing login for this person if any (do not create one).
    const { data: account } = await supabaseServer()
      .from('accounts')
      .select('id')
      .eq('profile_id', profile.id)
      .maybeSingle();

    const { data: trainer, error: trainerError } = await supabaseServer()
      .from('trainers')
      .insert({
        account_id: account?.id ?? null,
        profile_id: profile.id,
        specialization: specialization || '',
        experience_years: resolvedExperienceYears,
        bio: bio || '',
        certification: certification || '',
        hourly_rate: hourlyRate || 0,
        status: status || 'active',
      })
      .select()
      .single();

    if (trainerError || !trainer) {
      if (createdProfileId) {
        await supabaseServer().from('profiles').delete().eq('id', createdProfileId);
      }
      return NextResponse.json(
        { error: trainerError?.message || 'Failed to create trainer' },
        { status: 400 },
      );
    }

    const { data: member } = await supabaseServer()
      .from('members')
      .select('id')
      .eq('profile_id', profile.id)
      .maybeSingle();

    return NextResponse.json(
      {
        id: trainer.id,
        account_id: trainer.account_id,
        profile_id: profile.id,
        member_id: member?.id ?? null,
        first_name: profile.first_name ?? '',
        last_name: profile.last_name ?? '',
        email: null,
        profile_email: profile.profile_email,
        phone: profile.phone ?? '',
        specialization: trainer.specialization,
        experience_years: trainer.experience_years,
        bio: trainer.bio,
        certification: trainer.certification,
        hourly_rate: trainer.hourly_rate,
        status: trainer.status,
        isUnlinked: !trainer.account_id,
      },
      { status: 201 },
    );
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
      firstName,
      lastName,
      phone,
      profileEmail,
      specialization,
      experienceYears,
      bio,
      certification,
      hourlyRate,
      status,
    } = body;

    if (!trainerId) {
      return NextResponse.json({ error: 'trainerId is required' }, { status: 400 });
    }

    const { data: trainerRow, error: trainerLookupError } = await supabaseServer()
      .from('trainers')
      .select('id, account_id, profile_id')
      .eq('id', trainerId)
      .single();

    if (trainerLookupError || !trainerRow) {
      return NextResponse.json({ error: 'Trainer not found' }, { status: 404 });
    }

    const profileUpdates: Record<string, unknown> = {};
    if (firstName !== undefined) profileUpdates.first_name = firstName;
    if (lastName !== undefined) profileUpdates.last_name = lastName;
    if (phone !== undefined) profileUpdates.phone = phone;
    if (profileEmail !== undefined) profileUpdates.profile_email = profileEmail;

    if (Object.keys(profileUpdates).length > 0 && trainerRow.profile_id) {
      const { error: pErr } = await supabaseServer()
        .from('profiles')
        .update(profileUpdates)
        .eq('id', trainerRow.profile_id);
      if (pErr) {
        return NextResponse.json(
          { error: pErr.message || 'Failed to update profile' },
          { status: 500 },
        );
      }
    }

    const trainerUpdates: Record<string, unknown> = {};
    if (specialization !== undefined) trainerUpdates.specialization = specialization;
    if (experienceYears !== undefined) trainerUpdates.experience_years = experienceYears;
    if (bio !== undefined) trainerUpdates.bio = bio;
    if (certification !== undefined) trainerUpdates.certification = certification;
    if (hourlyRate !== undefined) trainerUpdates.hourly_rate = hourlyRate;
    if (status !== undefined) trainerUpdates.status = status;

    if (Object.keys(trainerUpdates).length > 0) {
      const { error: tErr } = await supabaseServer()
        .from('trainers')
        .update(trainerUpdates)
        .eq('id', trainerId);
      if (tErr) {
        return NextResponse.json(
          { error: tErr.message || 'Failed to update trainer' },
          { status: 500 },
        );
      }
    }

    const { data: updatedTrainer, error: fetchError } = await supabaseServer()
      .from('trainers')
      .select(
        `
        *,
        profiles!inner(
          first_name,
          last_name,
          phone,
          profile_email
        )
      `,
      )
      .eq('id', trainerId)
      .single();

    if (fetchError || !updatedTrainer) {
      return NextResponse.json({ error: 'Failed to fetch updated trainer' }, { status: 500 });
    }

    let accountEmail: string | null = null;
    if (updatedTrainer.account_id) {
      const { data: account } = await supabaseServer()
        .from('accounts')
        .select('email')
        .eq('id', updatedTrainer.account_id)
        .maybeSingle();
      accountEmail = account?.email ?? null;
    }

    return NextResponse.json({
      success: true,
      trainer: {
        id: updatedTrainer.id,
        account_id: updatedTrainer.account_id,
        profile_id: updatedTrainer.profile_id,
        specialization: updatedTrainer.specialization,
        experience_years: updatedTrainer.experience_years,
        bio: updatedTrainer.bio,
        certification: updatedTrainer.certification,
        hourly_rate: updatedTrainer.hourly_rate,
        status: updatedTrainer.status ?? '',
        first_name: updatedTrainer.profiles?.first_name ?? '',
        last_name: updatedTrainer.profiles?.last_name ?? '',
        email: accountEmail ?? '',
        profile_email: updatedTrainer.profiles?.profile_email ?? null,
        phone: updatedTrainer.profiles?.phone ?? '',
        isUnlinked: !updatedTrainer.account_id,
      },
    });
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
    const trainerId = body.trainerId || body.id;
    if (!trainerId) {
      return NextResponse.json({ error: 'trainerId is required' }, { status: 400 });
    }

    const { data: trainer, error: trainerError } = await supabaseServer()
      .from('trainers')
      .select('id, profile_id, account_id')
      .eq('id', trainerId)
      .single();

    if (trainerError || !trainer) {
      return NextResponse.json({ error: 'Trainer not found' }, { status: 404 });
    }

    // Delete role only — keep account/member/profile (same person may still exist).
    const { error: deleteError } = await supabaseServer()
      .from('trainers')
      .delete()
      .eq('id', trainerId);

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message || 'Failed to delete trainer' },
        { status: 500 },
      );
    }

    // Clean orphan profile if nothing else references it.
    if (trainer.profile_id) {
      const [{ data: member }, { data: account }, { data: otherTrainer }] = await Promise.all([
        supabaseServer()
          .from('members')
          .select('id')
          .eq('profile_id', trainer.profile_id)
          .maybeSingle(),
        supabaseServer()
          .from('accounts')
          .select('id')
          .eq('profile_id', trainer.profile_id)
          .maybeSingle(),
        supabaseServer()
          .from('trainers')
          .select('id')
          .eq('profile_id', trainer.profile_id)
          .maybeSingle(),
      ]);

      if (!member && !account && !otherTrainer) {
        await supabaseServer().from('profiles').delete().eq('id', trainer.profile_id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[DELETE /api/trainers] Exception:', e);
    return NextResponse.json({ error: 'Failed to delete trainer', details: String(e) }, { status: 500 });
  }
} 