/** Canonical site origin for Base44 functions (set APP_URL / SITE_URL / VITE_APP_URL in deployment). */
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
