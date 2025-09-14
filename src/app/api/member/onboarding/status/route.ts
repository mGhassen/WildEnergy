import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

async function getUserFromToken(token: string) {
  const { data: { user }, error } = await supabaseServer().auth.getUser(token);
  if (error || !user) return null;
  const { data: userProfile } = await supabaseServer()
    .from('user_profiles')
    .select('*')
    .eq('email', user.email)
    .single();
  
  if (!userProfile) return null;
  
  // Get the profile_id from the accounts table
  const { data: account } = await supabaseServer()
    .from('accounts')
    .select('profile_id')
    .eq('id', userProfile.account_id)
    .single();
  
  return {
    ...userProfile,
    profile_id: account?.profile_id
  };
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

    // Get user onboarding status from the new member_onboarding_status view
    const { data: onboardingData, error } = await supabase
      .from("member_onboarding_status")
      .select("*")
      .eq("account_id", user.account_id)
      .single();

    if (error) {
      console.error("Error fetching user onboarding status:", error);
      return NextResponse.json({ 
        success: false, 
        error: "Erreur lors de la récupération du statut" 
      }, { status: 500 });
    }

    // Get profile data separately to check personal info completion
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("phone, profession, address")
      .eq("id", user.profile_id)
      .single();

    if (profileError) {
      console.error("Error fetching profile data:", profileError);
    }

    // Check if personal info is completed based on onboarding status
    // The personal_info_completed flag in the member_onboarding table is the source of truth
    const hasPersonalInfo = onboardingData.personal_info_completed || false;
    const hasPhysicalProfile = onboardingData.physical_profile_completed || false;
    const hasDiscoveryCompleted = onboardingData.discovery_completed || false;

    return NextResponse.json({ 
      success: true, 
      data: {
        onboardingCompleted: onboardingData.onboarding_completed || false,
        termsAccepted: onboardingData.terms_accepted || false,
        hasPersonalInfo,
        personalInfoCompleted: onboardingData.personal_info_completed || false,
        physicalProfileCompleted: hasPhysicalProfile,
        discoveryCompleted: hasDiscoveryCompleted,
        physicalProfile: onboardingData.physical_profile || null,
        discoverySource: onboardingData.discovery_source || null,
        termsAcceptedAt: onboardingData.terms_accepted_at || null,
        termsVersion: onboardingData.terms_version || null,
        termsTitle: onboardingData.terms_title || null,
        termsEffectiveDate: onboardingData.terms_effective_date || null,
        terms_version_id: onboardingData.terms_version_id || null,
        user: {
          first_name: onboardingData.first_name,
          last_name: onboardingData.last_name,
          email: onboardingData.email,
          member_status: onboardingData.member_status
        }
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
