/**
 * Shared admin gate for pages — second line of defence beyond ProtectedRoute.
 */
export function isPlatformAdmin(user) {
  const r = user?.role;
  return r === "admin" || r === "owner_admin";
}
