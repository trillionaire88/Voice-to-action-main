/**
 * Sanitise user-generated text before storing or displaying.
 * Strips script tags, javascript: URIs, and event handlers.
 * Does NOT strip HTML for display — use DOMPurify for that.
 */
export function sanitiseText(input: string, maxLength = 10000): string {
  if (!input || typeof input !== "string") return "";
  return input
    .slice(0, maxLength)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/data:text\/html/gi, "")
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, "")
    .trim();
}

export function sanitiseUrl(url: string): string {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) return "";
    return parsed.toString();
  } catch {
    return "";
  }
}

export function truncate(text: string, max: number): string {
  if (!text) return "";
  return text.length > max ? text.slice(0, max) + "…" : text;
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
