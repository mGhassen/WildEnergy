export function resolveAccessiblePortals(profile: {
  accessible_portals?: string[] | null;
  is_admin?: boolean | null;
  member_id?: string | null;
  trainer_id?: string | null;
}): string[] {
  const fromView = profile.accessible_portals?.filter(Boolean) ?? [];
  if (fromView.length > 0) return fromView;

  const portals: string[] = [];
  if (profile.is_admin) portals.push('admin');
  if (profile.member_id) portals.push('member');
  if (profile.trainer_id) portals.push('trainer');
  return portals;
}

export function normalizeAuthUser<T extends {
  isAdmin?: boolean;
  accessiblePortals?: string[] | null;
  member_id?: string | null;
  trainer_id?: string | null;
}>(user: T): T {
  return {
    ...user,
    accessiblePortals: resolveAccessiblePortals({
      accessible_portals: user.accessiblePortals,
      is_admin: user.isAdmin,
      member_id: user.member_id,
      trainer_id: user.trainer_id,
    }),
  };
}
