import { siteOrigin } from "./siteUrl.ts";

/** Stripe Checkout redirect URLs must stay on the deployed app origin (never arbitrary third-party hosts). */
export function validateCheckoutRedirectPair(successUrl: string, cancelUrl: string): string | null {
  let originUrl: URL;
  try {
    originUrl = new URL(siteOrigin());
  } catch {
    return "Invalid app origin configuration";
  }
  for (const raw of [successUrl, cancelUrl]) {
    try {
      const u = new URL(raw);
      if (u.origin !== originUrl.origin) return "Invalid redirect URLs";
    } catch {
      return "Invalid redirect URLs";
    }
  }
  return null;
}
