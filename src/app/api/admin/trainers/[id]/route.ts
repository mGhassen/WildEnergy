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
    const { data: trainer, error } = await supabaseServer()
      .from('user_profiles')
      .select('*')
      .eq('trainer_id', trainerId)
      .single();
      
    if (error) {
      console.error('Error fetching trainer:', error);
      return NextResponse.json({ error: 'Failed to fetch trainer', details: error }, { status: 500 });
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
      updated_at: trainer.updated_at
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