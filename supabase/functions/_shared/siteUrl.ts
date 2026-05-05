/** Canonical site origin for Edge Functions (align with VITE_APP_URL). */
export function siteOrigin(): string {
  const u =
    Deno.env.get("APP_ORIGIN") ||
    Deno.env.get("APP_URL") ||
    Deno.env.get("SITE_URL") ||
    Deno.env.get("VITE_APP_URL") ||
    "https://voicetoaction.io";
  return u.trim().replace(/\/+$/, "");
}

export function siteUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`
  return `${siteOrigin()}${p}`
}
