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
    const { firstName, lastName, age, profession, address, phone, profileEmail } = body;

    // Validate required fields
    if (!firstName || !lastName || !age || !profession || !address || !phone || !profileEmail) {
      return NextResponse.json({ 
        success: false, 
        error: "Tous les champs sont requis" 
      }, { status: 400 });
    }

    // Validate age
    if (age < 16 || age > 100) {
      return NextResponse.json({ 
        success: false, 
        error: "L'âge doit être entre 16 et 100 ans" 
      }, { status: 400 });
    }

    const supabase = supabaseServer();

    // Update profile with personal information
    const updateData: any = {
      first_name: firstName,
      last_name: lastName,
      phone: phone,
      profile_email: profileEmail,
      profession: profession,
      address: address,
      updated_at: new Date().toISOString(),
    };

    // Calculate date of birth from age
    const currentYear = new Date().getFullYear();
    const birthYear = currentYear - age;
    updateData.date_of_birth = new Date(birthYear, 0, 1).toISOString();

    const { error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", user.account_id);

    if (error) {
      console.error("Error updating user personal info:", error);
      return NextResponse.json({ 
        success: false, 
        error: "Erreur lors de la mise à jour des informations" 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: "Informations personnelles sauvegardées" 
    });

  } catch (error) {
    console.error("Personal info API error:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Erreur interne du serveur" 
    }, { status: 500 });
  }
}
