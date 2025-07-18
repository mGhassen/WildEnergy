import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

function extractRegistrationIdFromUrl(request: NextRequest): string | null {
  const match = request.nextUrl.pathname.match(/\/checkins\/([^/]+)\/unvalidate/);
  return match ? match[1] : null;
}

export async function POST(request: NextRequest) {
  const registrationId = extractRegistrationIdFromUrl(request);
  if (!registrationId) {
    return NextResponse.json({ success: false, message: 'No registration ID provided' }, { status: 400 });
  }

  try {
    // Delete the check-in for this registration
    const { error: deleteError } = await supabaseServer
      .from('checkins')
      .delete()
      .eq('registration_id', registrationId);

    if (deleteError) {
      return NextResponse.json({ success: false, message: 'Failed to unvalidate check-in', details: deleteError.message }, { status: 500 });
    }

    // Optionally, update the registration notes/status
    await supabaseServer
      .from('class_registrations')
      .update({ notes: 'Check-in unvalidated' })
      .eq('id', registrationId);

    return NextResponse.json({ success: true, message: 'Check-in unvalidated successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Failed to unvalidate check-in', details: error.message }, { status: 500 });
  }
} 