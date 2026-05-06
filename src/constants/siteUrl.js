/**
 * Canonical production site URL for links, emails body URLs, and SEO.
 * Override with VITE_APP_URL (no trailing slash), e.g. https://voicetoaction.com
 * In the browser, falls back to window.location.origin when unset.
 */
export function getAppOrigin() {
  const fromEnv = import.meta.env.VITE_APP_URL
  if (fromEnv && String(fromEnv).trim()) {
    return String(fromEnv).replace(/\/+$/, '')
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }
  return 'https://voicetoaction.com'
}

/** Resolved once at module load (uses env + SSR fallback). Prefer getAppOrigin() if you need fresh window origin in tests. */
export const APP_ORIGIN = getAppOrigin()

/** Path starting with / — returns full absolute URL */
export function appUrl(path = '/') {
  const p = path.startsWith('/') ? path : `/${path}`
  return `${getAppOrigin()}${p}`
}

/** Hostname only, for display/metadata (e.g. watermark). */
export function appHostname() {
  try {
    return new URL(getAppOrigin()).hostname
  } catch {
    return 'voicetoaction.com'
  }
}

/** Public support inbox shown in legal/export copy (avoid hardcoding alternate domains). */
export const SUPPORT_EMAIL =
  import.meta.env.VITE_SUPPORT_EMAIL || 'support@voicetoaction.io'
