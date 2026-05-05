import { supabase } from "@/lib/supabase";

const FUNCTIONS_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

async function getAuthHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.access_token) {
    return {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    };
  }
  const { data: refreshed } = await supabase.auth.refreshSession();
  if (refreshed?.session?.access_token) {
    return {
      Authorization: `Bearer ${refreshed.session.access_token}`,
      "Content-Type": "application/json",
    };
  }
  throw new Error("You must be signed in to continue. Please sign in and try again.");
}

export async function startPetitionWithdrawalCheckout(
  petitionId: string,
): Promise<{ checkout_url?: string; already_paid?: boolean }> {
  try {
    const headers = await getAuthHeaders();
    const successUrl = `${window.location.origin}/PetitionWithdraw?id=${petitionId}&paid=1`;
    const cancelUrl = window.location.href;

    const res = await fetch(`${FUNCTIONS_BASE}/petition-withdrawal-checkout`, {
      method: "POST",
      headers,
      body: JSON.stringify({ petition_id: petitionId, success_url: successUrl, cancel_url: cancelUrl }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error("[paymentsApi] petition-withdrawal-checkout error:", data);
      throw new Error(data.error || "Failed to start checkout");
    }
    return data;
  } catch (e) {
    console.error("[paymentsApi] startPetitionWithdrawalCheckout:", e);
    throw e;
  }
}

export async function sendPetitionWithdrawalEmail(petitionId: string, stripeSessionId?: string): Promise<void> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${FUNCTIONS_BASE}/petition-withdrawal-email`, {
      method: "POST",
      headers,
      body: JSON.stringify({ petition_id: petitionId, stripe_session_id: stripeSessionId }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error("[paymentsApi] petition-withdrawal-email error:", data);
      throw new Error(data.error || "Failed to send withdrawal email");
    }
  } catch (e) {
    console.error("[paymentsApi] sendPetitionWithdrawalEmail:", e);
    throw e;
  }
}

export async function startSupportCreatorCheckout(
  amount: number,
  paymentType: "owner_gift" | "platform_donation" | "creator_subscription",
): Promise<string> {
  try {
    const headers = await getAuthHeaders();
    const successUrl =
      paymentType === "platform_donation"
        ? `${window.location.origin}/PlatformFunding?donated=1`
        : paymentType === "creator_subscription"
          ? `${window.location.origin}/CreatorReferral?subscribed=1`
          : `${window.location.origin}/SupportOwner?donated=1`;
    const cancelUrl = window.location.href;

    const res = await fetch(`${FUNCTIONS_BASE}/support-creator-checkout`, {
      method: "POST",
      headers,
      body: JSON.stringify({ amount, payment_type: paymentType, success_url: successUrl, cancel_url: cancelUrl }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error("[paymentsApi] support-creator-checkout error:", data);
      throw new Error(data.error || "Payment failed. Please try again.");
    }
    return data.checkout_url;
  } catch (e) {
    console.error("[paymentsApi] startSupportCreatorCheckout:", e);
    throw e;
  }
}

/** $20 AUD — Creator Referral Program (checkout; webhook may finalize subscription record). */
export async function startCreatorReferralCheckout(): Promise<string> {
  return startSupportCreatorCheckout(20, "creator_subscription");
}

export async function hasAlreadyPaidWithdrawal(petitionId: string): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("petition_withdrawals")
    .select("id")
    .eq("petition_id", petitionId)
    .eq("user_id", user.id)
    .maybeSingle();

  return !!data;
}
