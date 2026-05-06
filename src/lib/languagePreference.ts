import i18n from "@/lib/i18n";

/** Single source of truth for UI language in localStorage (browser). */
export const VTA_LANGUAGE_KEY = "vta_language";

export const SUPPORTED_LANGUAGE_CODES = ["en", "es", "fr", "ar", "pt", "hi", "zh"] as const;

export type SupportedLanguageCode = (typeof SUPPORTED_LANGUAGE_CODES)[number];

export function normalizeLanguageCode(code: string | null | undefined): SupportedLanguageCode {
  if (!code) return "en";
  const base = String(code).split("-")[0].toLowerCase();
  return (SUPPORTED_LANGUAGE_CODES as readonly string[]).includes(base)
    ? (base as SupportedLanguageCode)
    : "en";
}

/**
 * Signed-in: saved profile preference wins, then localStorage, then English.
 * Use after loading `profiles` so new accounts (default en) and returning users behave correctly.
 */
export function applyLanguagePreferenceFromProfile(
  profile: { language_preference?: string | null } | null | undefined
) {
  const stored =
    typeof localStorage !== "undefined" ? localStorage.getItem(VTA_LANGUAGE_KEY) : null;
  const fromProfile = profile?.language_preference;
  const code = fromProfile
    ? normalizeLanguageCode(fromProfile)
    : normalizeLanguageCode(stored);
  void i18n.changeLanguage(code);
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(VTA_LANGUAGE_KEY, code);
  }
}

export function persistLanguageChoice(code: string) {
  const normalized = normalizeLanguageCode(code);
  void i18n.changeLanguage(normalized);
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(VTA_LANGUAGE_KEY, normalized);
  }
  return normalized;
}
