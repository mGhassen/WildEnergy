import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    
    console.log('Test auth API called');
    console.log('Environment variables check:');
    console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'present' : 'missing');
    console.log('SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'present' : 'missing');
    
    if (!token) {
      return NextResponse.json({
        success: false,
        error: 'No token provided',
        message: 'Please provide a valid token in the Authorization header'
      }, { status: 401 });
    }

    console.log('Token provided, length:', token.length);
    console.log('Token preview:', token.substring(0, 20) + '...');

    // Test token validation
    const { data: { user }, error: userError } = await supabaseServer.auth.getUser(token);
    
    if (userError) {
      console.log('Token validation error:', userError);
      return NextResponse.json({
        success: false,
        error: 'Token validation failed',
        details: userError.message
      }, { status: 401 });
    }

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'No user found for token'
      }, { status: 401 });
    }

    console.log('Token validated successfully for user:', user.id);

    return NextResponse.json({
      success: true,
      message: 'Token is valid',
      user: {
        id: user.id,
        email: user.email
      }
    });
  } catch (error: any) {
    console.error('Test auth API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Test auth API failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 