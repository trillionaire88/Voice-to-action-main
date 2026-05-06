/**
 * Canonical `communities` table columns vs legacy duplicates stored on some rows:
 *
 * | Concept            | Canonical column      | Legacy duplicate(s)        |
 * |--------------------|-----------------------|----------------------------|
 * | Display title      | name                  | community_name             |
 * | Public description | description_public    | community_description      |
 * | Visibility         | visibility            | community_visibility       |
 * | Logo URL           | logo_url              | community_logo             |
 * | Banner URL         | banner_url            | community_banner           |
 * | Billing tier       | plan                  | community_plan             |
 * | Owner user id      | founder_user_id       | community_owner            |
 * | Topic tags         | tags (text[])         | community_tags             |
 *
 * All new writes MUST use canonical columns only. Use these helpers when reading so
 * older rows that only populated legacy fields still display correctly.
 */

export type CommunityRow = Record<string, unknown>;

export function communityName(c: CommunityRow | null | undefined): string {
  if (!c) return "";
  const v = c.name ?? c.community_name;
  return typeof v === "string" ? v : "";
}

export function communityDescriptionPublic(c: CommunityRow | null | undefined): string {
  if (!c) return "";
  const v = c.description_public ?? c.community_description;
  return typeof v === "string" ? v : "";
}

export function communityVisibilityValue(c: CommunityRow | null | undefined): string {
  if (!c) return "public";
  const v = c.visibility ?? c.community_visibility;
  return typeof v === "string" ? v : "public";
}

export function communityLogoUrl(c: CommunityRow | null | undefined): string {
  if (!c) return "";
  const v = c.logo_url ?? c.community_logo;
  return typeof v === "string" ? v : "";
}

export function communityBannerUrl(c: CommunityRow | null | undefined): string {
  if (!c) return "";
  const v = c.banner_url ?? c.community_banner;
  return typeof v === "string" ? v : "";
}

/** Subscription / tier: free | paid | private */
export function communityPlanTier(c: CommunityRow | null | undefined): string {
  if (!c) return "free";
  const v = c.plan ?? c.community_plan;
  return typeof v === "string" && v ? v : "free";
}

export function communityOwnerId(c: CommunityRow | null | undefined): string {
  if (!c) return "";
  const v = c.founder_user_id ?? c.community_owner;
  return typeof v === "string" ? v : "";
}

export function communityTagsList(c: CommunityRow | null | undefined): string[] {
  if (!c) return [];
  const raw = c.tags ?? c.community_tags;
  if (Array.isArray(raw)) return raw.filter((t): t is string => typeof t === "string");
  return [];
}
