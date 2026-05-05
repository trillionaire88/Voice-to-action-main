/**
 * Paid / private community subscription pricing (AUD).
 * Must stay in sync with `supabase/functions/community-subscribe/index.ts`
 * (`unit_amount` cents and marketing copy).
 */
export const COMMUNITY_SUBSCRIPTION_AMOUNT_CENTS = 1099;
export const COMMUNITY_SUBSCRIPTION_PRICE_AUD =
  COMMUNITY_SUBSCRIPTION_AMOUNT_CENTS / 100;

export const COMMUNITY_SUBSCRIPTION_PRICE_LABEL = `$${COMMUNITY_SUBSCRIPTION_PRICE_AUD.toFixed(2)} AUD / month`;
