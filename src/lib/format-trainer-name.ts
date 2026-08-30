type TrainerLike = {
  first_name?: string | null;
  last_name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  specialization?: string | null;
  user?: { first_name?: string | null; last_name?: string | null } | null;
  member?: { first_name?: string | null; last_name?: string | null } | null;
  profile?: { first_name?: string | null; last_name?: string | null } | null;
  profiles?: { first_name?: string | null; last_name?: string | null } | null;
} | null | undefined;

function joinName(first?: string | null, last?: string | null): string | null {
  const name = [first, last].filter(Boolean).join(" ").trim();
  return name || null;
}

export function formatTrainerDisplayName(trainer: TrainerLike): string {
  if (!trainer) return "Unknown Trainer";

  return (
    joinName(trainer.first_name, trainer.last_name) ??
    joinName(trainer.firstName, trainer.lastName) ??
    joinName(trainer.user?.first_name, trainer.user?.last_name) ??
    joinName(trainer.member?.first_name, trainer.member?.last_name) ??
    joinName(trainer.profile?.first_name, trainer.profile?.last_name) ??
    joinName(trainer.profiles?.first_name, trainer.profiles?.last_name) ??
    (trainer.specialization?.trim() || "Unknown Trainer")
  );
}
