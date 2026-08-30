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

export async function batchResolveTrainerProfiles(
  supabase: SupabaseClient,
  trainers: (TrainerRow | null | undefined)[],
): Promise<Map<string, TrainerProfileDetails>> {
  const validTrainers = trainers.filter(Boolean) as TrainerRow[];
  const result = new Map<string, TrainerProfileDetails>();

  if (validTrainers.length === 0) return result;

  const accountIds = [
    ...new Set(
      validTrainers
        .map((trainer) => trainer.account_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const accountProfiles: Record<
    string,
    { first_name: string | null; last_name: string | null; email: string | null; phone: string | null }
  > = {};

  if (accountIds.length > 0) {
    const { data } = await supabase
      .from('user_profiles')
      .select('account_id, first_name, last_name, email, phone')
      .in('account_id', accountIds);

    for (const profile of data ?? []) {
      accountProfiles[profile.account_id] = profile;
    }
  }

  const trainerProfileIdMap: Record<string, string> = {};
  const profileIds = new Set<string>();
  const trainerIdsMissingProfileId: string[] = [];

  for (const trainer of validTrainers) {
    if (trainer.profile_id) {
      trainerProfileIdMap[trainer.id] = trainer.profile_id;
      profileIds.add(trainer.profile_id);
    } else if (!trainer.account_id || !accountProfiles[trainer.account_id]) {
      trainerIdsMissingProfileId.push(trainer.id);
    }
  }

  if (trainerIdsMissingProfileId.length > 0) {
    const { data } = await supabase
      .from('trainers')
      .select('id, profile_id')
      .in('id', trainerIdsMissingProfileId);

    for (const row of data ?? []) {
      if (row.profile_id) {
        trainerProfileIdMap[row.id] = row.profile_id;
        profileIds.add(row.profile_id);
      }
    }
  }

  const profiles: Record<
    string,
    { first_name: string | null; last_name: string | null; phone: string | null; profile_email: string | null }
  > = {};

  if (profileIds.size > 0) {
    const { data } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, phone, profile_email')
      .in('id', [...profileIds]);

    for (const profile of data ?? []) {
      profiles[profile.id] = profile;
    }
  }

  for (const trainer of validTrainers) {
    if (trainer.account_id && accountProfiles[trainer.account_id]) {
      result.set(trainer.id, { ...trainer, ...accountProfiles[trainer.account_id] });
      continue;
    }

    const profileId = trainer.profile_id ?? trainerProfileIdMap[trainer.id];
    const profile = profileId ? profiles[profileId] : null;

    if (profile) {
      result.set(trainer.id, {
        ...trainer,
        first_name: profile.first_name,
        last_name: profile.last_name,
        email: profile.profile_email,
        phone: profile.phone,
      });
    }
  }

  return result;
}

export function enrichTrainerWithProfile<T extends TrainerRow>(
  trainer: T | null | undefined,
  profileMap: Map<string, TrainerProfileDetails>,
): (T & Partial<TrainerProfileDetails> & { member?: { first_name: string | null; last_name: string | null } }) | null | undefined {
  if (!trainer) return trainer;

  const profile = profileMap.get(trainer.id);
  if (!profile) return trainer;

  return {
    ...trainer,
    first_name: profile.first_name,
    last_name: profile.last_name,
    email: profile.email,
    phone: profile.phone,
    member: {
      first_name: profile.first_name,
      last_name: profile.last_name,
    },
  };
}
