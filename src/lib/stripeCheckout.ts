import { supabase } from "@/lib/supabase";

export interface CheckoutOptions {
  payment_type: string;
  amount?: number;
  referral_code?: string;
  metadata?: Record<string, string>;
  success_url?: string;
  cancel_url?: string;
}

const STRIPE_CHECKOUT_FN =
  import.meta.env.VITE_STRIPE_CHECKOUT_FUNCTION?.trim() || "stripe-checkout";

export async function initiateStripeCheckout(options: CheckoutOptions): Promise<void> {
  const {
    payment_type,
    amount,
    referral_code,
    metadata = {},
    success_url = window.location.href,
    cancel_url = window.location.href,
  } = options;

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    throw new Error("Please log in to continue with payment.");
  }

  const { data, error } = await supabase.functions.invoke(STRIPE_CHECKOUT_FN, {
    body: {
      payment_type,
      amount,
      referral_code,
      metadata,
      success_url,
      cancel_url,
    },
  });

  if (error) throw new Error(error.message || "Payment failed. Please try again.");
  if (!data?.checkout_url) throw new Error("Payment service unavailable. Please try again.");

  window.location.href = data.checkout_url;
}

export async function initiateStripeIdentityVerification(options: {
  action: "create_session" | "check_status";
  session_id?: string;
  return_url?: string;
}): Promise<{ url?: string; verified?: boolean; status?: string }> {
  const { data: { session: authSession } } = await supabase.auth.getSession();
  if (!authSession) throw new Error("Please log in to continue with identity verification.");

  // Route to the correct function based on action
  const functionName = options.action === "check_status"
    ? "stripe-identity-check"
    : "stripe-identity-start";

  const body = options.action === "check_status"
    ? { session_id: options.session_id }
    : { return_url: options.return_url };

  const { data, error } = await supabase.functions.invoke(functionName, { body });

  if (error) {
    throw new Error(error.message || "Failed to process identity verification");
  }

  return data;
}
