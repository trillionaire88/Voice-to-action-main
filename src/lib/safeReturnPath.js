/**
 * Prevent open redirects: only allow same-site relative paths (e.g. /Home), never protocol-relative or absolute URLs.
 */
export function getSafeReturnPath(raw, fallback = "/Home") {
  if (raw == null || typeof raw !== "string") return fallback;
  const p = raw.trim();
  if (!p.startsWith("/") || p.startsWith("//") || p.includes("://")) return fallback;
  if (p.length > 2048) return fallback;
  return p;
}
