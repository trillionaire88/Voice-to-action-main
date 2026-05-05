/** Canonical site origin for Edge Functions (align with VITE_APP_URL). */
export function siteOrigin(): string {
  const u =
    Deno.env.get("APP_URL") ||
    Deno.env.get("SITE_URL") ||
    Deno.env.get("VITE_APP_URL") ||
    ""
  const trimmed = u.trim()
  return trimmed ? trimmed.replace(/\/+$/, "") : "https://voicetoaction.com"
}

export function siteUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`
  return `${siteOrigin()}${p}`
}
