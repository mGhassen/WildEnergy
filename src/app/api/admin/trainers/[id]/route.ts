import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

function extractIdFromUrl(request: NextRequest): string | null {
  const match = request.nextUrl.pathname.match(/\/trainers\/(.+?)(\/|$)/);
  return match ? match[1] : null;
}

export async function GET(request: NextRequest) {
  try {
    const trainerId = extractIdFromUrl(request);
    if (!trainerId) {
      return NextResponse.json({ error: 'Trainer ID is required' }, { status: 400 });
    }

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    // Verify user (member or admin) using new user system
    const { data: { user }, error: authError } = await supabaseServer().auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
    
    // Fetch trainer details from new user system
    // First try to find by trainer_id in user_profiles view
    let { data: trainer, error: trainerError } = await supabaseServer()
      .from('user_profiles')
      .select('*')
      .eq('trainer_id', trainerId)
      .single();

    // If not found by trainer_id, try by account_id
    if (trainerError && trainerError.code === 'PGRST116') {
      const fallbackResult = await supabaseServer()
        .from('user_profiles')
        .select('*')
        .eq('account_id', trainerId)
        .single();
      
      trainer = fallbackResult.data;
      trainerError = fallbackResult.error;
    }

    // If still not found, try to find unlinked trainer directly from trainers table
    if (trainerError && trainerError.code === 'PGRST116') {
      const { data: unlinkedTrainer, error: unlinkedError } = await supabaseServer()
        .from('trainers')
        .select(`
          *,
          profiles!inner(
            first_name,
            last_name,
            phone,
            date_of_birth,
            address,
            profession,
            emergency_contact_name,
            emergency_contact_phone,
            profile_image_url
          )
        `)
        .eq('id', trainerId)
        .single();

      if (!unlinkedError && unlinkedTrainer) {
        // Create a trainer object in the expected format for unlinked trainers
        trainer = {
          trainer_id: unlinkedTrainer.id,
          account_id: null, // Unlinked trainer has no account
          email: null, // No email for unlinked trainers
          account_status: null,
          last_login: null,
          first_name: unlinkedTrainer.profiles.first_name,
          last_name: unlinkedTrainer.profiles.last_name,
          phone: unlinkedTrainer.profiles.phone,
          date_of_birth: unlinkedTrainer.profiles.date_of_birth,
          address: unlinkedTrainer.profiles.address,
          profession: unlinkedTrainer.profiles.profession,
          emergency_contact_name: unlinkedTrainer.profiles.emergency_contact_name,
          emergency_contact_phone: unlinkedTrainer.profiles.emergency_contact_phone,
          profile_image_url: unlinkedTrainer.profiles.profile_image_url,
          member_id: null,
          member_notes: null,
          credit: null,
          member_status: null,
          specialization: unlinkedTrainer.specialization,
          experience_years: unlinkedTrainer.experience_years,
          bio: unlinkedTrainer.bio,
          certification: unlinkedTrainer.certification,
          hourly_rate: unlinkedTrainer.hourly_rate,
          trainer_status: unlinkedTrainer.status,
          user_type: 'trainer', // Unlinked trainers are just trainers
          accessible_portals: ['trainer'] // Unlinked trainers only have trainer portal access
        };
        trainerError = null; // Clear the error since we found the trainer
      }
    }
      
    if (trainerError) {
      console.error('Error fetching trainer:', trainerError);
      return NextResponse.json({ error: 'Failed to fetch trainer', details: trainerError }, { status: 500 });
    }

    if (!trainer) {
      return NextResponse.json({ error: 'Trainer not found' }, { status: 404 });
    }
    
    // Format trainer data for frontend compatibility
    const trainerData = {
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
      accessible_portals: trainer.accessible_portals,
      created_at: trainer.created_at,
      updated_at: trainer.updated_at,
      isUnlinked: trainer.account_id === null // Flag to indicate if trainer is unlinked
    };
    
    return NextResponse.json(trainerData);
  } catch (e) {
    console.error('Internal server error:', e);
    return NextResponse.json({ error: 'Internal server error', details: String(e) }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const id = extractIdFromUrl(request);
  // TODO: Implement logic to update trainer by ID
  return NextResponse.json({ message: `Update trainer ${id}` });
}

export async function DELETE(request: NextRequest) {
  const id = extractIdFromUrl(request);
  // TODO: Implement logic to delete trainer by ID
  return NextResponse.json({ message: `Delete trainer ${id}` });
} 