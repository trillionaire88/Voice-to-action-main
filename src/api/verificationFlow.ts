import { supabase } from "@/lib/supabase";

const FUNCTIONS_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated. Please sign in.");
  return {
    Authorization: `Bearer ${session.access_token}`,
    "Content-Type": "application/json",
  };
}

export async function startBlueCheckmarkCheckout(successUrl: string, cancelUrl: string): Promise<string> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${FUNCTIONS_BASE}/stripe-checkout-blue`, {
    method: "POST", headers,
    body: JSON.stringify({ success_url: successUrl, cancel_url: cancelUrl }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to start checkout");
  return data.checkout_url;
}

export async function startStripeIdentity(returnUrl: string): Promise<string> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${FUNCTIONS_BASE}/stripe-identity-start`, {
    method: "POST", headers,
    body: JSON.stringify({ return_url: returnUrl }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to start identity verification");
  return data.verification_url;
}

export async function checkStripeIdentityResult(sessionId: string): Promise<{ verified: boolean; status: string }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${FUNCTIONS_BASE}/stripe-identity-check`, {
    method: "POST", headers,
    body: JSON.stringify({ session_id: sessionId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to check identity status");
  return { verified: data.verified, status: data.status };
}

export function userHasBlueCheckmark(profile: any): boolean {
  if (!profile) return false;
  return !!(
    profile.is_blue_verified ||
    profile.is_kyc_verified ||
    profile.paid_identity_verification_completed ||
    profile.is_verified ||
    profile.identity_verified
  );
}
