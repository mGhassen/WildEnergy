import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    // Test if we can access Supabase Auth admin functions
    console.log('Testing Supabase Auth admin access...');
    
    // Test 1: Check if service role key is working
    const { data: { users }, error: listError } = await supabaseServer.auth.admin.listUsers();
    
    if (listError) {
      console.error('Failed to list users:', listError);
      return NextResponse.json({ 
        error: 'Service role key not working or insufficient permissions',
        details: listError.message 
      }, { status: 500 });
    }
    
    console.log('Successfully listed users:', users?.length || 0);
    
    // Test 2: Check if we can get a specific user (if any exist)
    if (users && users.length > 0) {
      const testUser = users[0];
      console.log('Testing with user:', testUser.id);
      
      const { data: { user }, error: getUserError } = await supabaseServer.auth.admin.getUserById(testUser.id);
      
      if (getUserError) {
        console.error('Failed to get user by ID:', getUserError);
        return NextResponse.json({ 
          error: 'Cannot get user by ID',
          details: getUserError.message 
        }, { status: 500 });
      }
      
      console.log('Successfully retrieved user by ID');
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Supabase Auth admin operations are working correctly',
      userCount: users?.length || 0
    });
    
  } catch (error) {
    console.error('Test failed:', error);
    return NextResponse.json({ 
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 