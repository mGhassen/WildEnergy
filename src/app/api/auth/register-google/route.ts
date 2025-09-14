import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase';
import { z } from 'zod';

const registerGoogleSchema = z.object({
  email: z.string().email(),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  google_id: z.string().min(1),
  avatar_url: z.string().optional(),
  access_token: z.string().min(1),
  refresh_token: z.string().optional()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate the request body
    const validatedData = registerGoogleSchema.parse(body);
    
    const supabase = createSupabaseClient();
    
    // Check if account already exists
    const { data: existingAccount, error: checkError } = await supabase
      .from('accounts')
      .select('id')
      .eq('email', validatedData.email)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Account check error:', checkError);
      return NextResponse.json(
        { error: 'Failed to check account existence' },
        { status: 500 }
      );
    }

    if (existingAccount) {
      return NextResponse.json(
        { error: 'Account already exists with this email' },
        { status: 400 }
      );
    }

    // Create the account
    const { data: newAccount, error: createError } = await supabase
      .from('accounts')
      .insert({
        email: validatedData.email,
        first_name: validatedData.first_name,
        last_name: validatedData.last_name,
        is_admin: false,
        status: 'active',
        user_type: 'member',
        accessible_portals: ['member'],
        google_id: validatedData.google_id,
        avatar_url: validatedData.avatar_url,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) {
      console.error('Account creation error:', createError);
      return NextResponse.json(
        { error: 'Failed to create account' },
        { status: 500 }
      );
    }

    // Store the Google tokens for future use (you might want to store these in a separate table)
    // For now, we'll just return success since the user is already authenticated via Google

    return NextResponse.json({
      success: true,
      account: {
        id: newAccount.id,
        email: newAccount.email,
        first_name: newAccount.first_name,
        last_name: newAccount.last_name,
        is_admin: newAccount.is_admin,
        status: newAccount.status,
        user_type: newAccount.user_type,
        accessible_portals: newAccount.accessible_portals
      }
    });

  } catch (error) {
    console.error('Google registration error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
