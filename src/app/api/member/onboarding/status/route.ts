import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

async function getUserFromToken(token: string) {
  const { data: { user }, error } = await supabaseServer().auth.getUser(token);
  if (error || !user) return null;
  const { data: userProfile } = await supabaseServer()
    .from('users')
    .select('*')
    .eq('auth_user_id', user.id)
    .single();
  return userProfile;
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json({ success: false, error: "Token manquant" }, { status: 401 });
    }

    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ success: false, error: "Non autorisé" }, { status: 401 });
    }

    const supabase = supabaseServer();

    // Get user onboarding status - handle case where onboarding fields don't exist yet
    const { data: userData, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("Error fetching user onboarding status:", error);
      return NextResponse.json({ 
        success: false, 
        error: "Erreur lors de la récupération du statut" 
      }, { status: 500 });
    }

    // Handle case where onboarding fields don't exist yet (migration not applied)
    const onboardingCompleted = userData.onboarding_completed || false;
    const termsAccepted = userData.terms_accepted || false;
    const hasPersonalInfo = !!(userData.first_name && userData.last_name && userData.age && userData.profession && userData.address && userData.phone);

    return NextResponse.json({ 
      success: true, 
      data: {
        onboardingCompleted,
        termsAccepted,
        hasPersonalInfo,
        user: userData
      }
    });

  } catch (error) {
    console.error("Onboarding status API error:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Erreur interne du serveur" 
    }, { status: 500 });
  }
}
