/**
 * Paid / private community subscription pricing (AUD).
 * Must stay in sync with `supabase/functions/community-subscribe/index.ts`
 * and `base44/functions/stripeCheckout` (`community_subscription` cents).
 */
/** Canonical monthly price = $19.99 AUD — must match Stripe checkout (`community_subscription` in edge functions). */
export const COMMUNITY_SUBSCRIPTION_AMOUNT_CENTS = 1999;
export const COMMUNITY_SUBSCRIPTION_PRICE_AUD =
  COMMUNITY_SUBSCRIPTION_AMOUNT_CENTS / 100;

export const COMMUNITY_SUBSCRIPTION_PRICE_LABEL = `$${COMMUNITY_SUBSCRIPTION_PRICE_AUD.toFixed(2)} AUD / month`;
