import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseServer } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (token) {
      // Sign out from Supabase Auth using the client
      const { error } = await supabaseServer().auth.signOut();
      if (error) {
        console.error("Supabase logout error:", error);
        // Continue with logout even if Supabase logout fails
      }
    }
    
    const cookieStore = await cookies();
    
    // Clear all auth-related cookies
    await cookieStore.delete("auth-token");
    await cookieStore.delete("refresh-token");
    await cookieStore.delete("user-role");
    
    return NextResponse.json(
      { message: "Logged out successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "Failed to logout" },
      { status: 500 }
    );
  }
} 