import type { SupabaseClient } from '@supabase/supabase-js';

type TrainerRow = {
  id: string;
  account_id?: string | null;
  profile_id?: string | null;
  specialization?: string | null;
  experience_years?: number | null;
  bio?: string | null;
  certification?: string | null;
  status?: string | null;
};

export type TrainerProfileDetails = TrainerRow & {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
};

export async function resolveTrainerProfile(
  supabase: SupabaseClient,
  trainer: TrainerRow | null | undefined,
): Promise<TrainerProfileDetails | null> {
  if (!trainer) return null;

  if (trainer.account_id) {
    const { data } = await supabase
      .from('user_profiles')
      .select('first_name, last_name, email, phone')
      .eq('account_id', trainer.account_id)
      .single();

    if (data) {
      return { ...trainer, ...data };
    }
  }

  let profileId = trainer.profile_id ?? null;
  if (!profileId) {
    const { data: row } = await supabase
      .from('trainers')
      .select('profile_id')
      .eq('id', trainer.id)
      .single();
    profileId = row?.profile_id ?? null;
  }

  if (profileId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name, phone, profile_email')
      .eq('id', profileId)
      .single();

    if (profile) {
      return {
        ...trainer,
        first_name: profile.first_name,
        last_name: profile.last_name,
        email: profile.profile_email,
        phone: profile.phone,
      };
    }
  }

  return null;
}

export async function resolveTrainerProfileById(
  supabase: SupabaseClient,
  trainerId: string | null | undefined,
): Promise<TrainerProfileDetails | null> {
  if (!trainerId) return null;

  const { data: trainer } = await supabase
    .from('trainers')
    .select(`
      id,
      account_id,
      profile_id,
      specialization,
      experience_years,
      bio,
      certification,
      status
    `)
    .eq('id', trainerId)
    .single();

  return resolveTrainerProfile(supabase, trainer);
}
