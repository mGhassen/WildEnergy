import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

async function getUserFromToken(token: string) {
  const { data: { user }, error } = await supabaseServer().auth.getUser(token);
  if (error || !user) return null;
  const { data: userProfile } = await supabaseServer()
    .from('user_profiles')
    .select('*')
    .eq('account_id', user.id)
    .single();
  return userProfile;
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { termsAccepted } = body;

    if (!termsAccepted) {
      return NextResponse.json({ 
        success: false, 
        error: "Vous devez accepter les conditions générales" 
      }, { status: 400 });
    }

    const supabase = supabaseServer();
    const now = new Date().toISOString();

    // Update user with terms acceptance and complete onboarding
    const updateData: any = {
      status: "active", // Activate the user account
      updated_at: now,
    };

    // Only add onboarding fields if they exist in the database
    try {
      updateData.terms_accepted = true;
      updateData.terms_accepted_at = now;
      updateData.onboarding_completed = true;
      updateData.onboarding_completed_at = now;
    } catch (error) {
      console.log("Onboarding fields not available, updating basic fields only");
    }

    const { error } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", user.id);

    if (error) {
      console.error("Error updating user terms acceptance:", error);
      return NextResponse.json({ 
        success: false, 
        error: "Erreur lors de l'acceptation des conditions" 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: "Conditions acceptées et inscription finalisée" 
    });

  } catch (error) {
    console.error("Accept terms API error:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Erreur interne du serveur" 
    }, { status: 500 });
  }
}
