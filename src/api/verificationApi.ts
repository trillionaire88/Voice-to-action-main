/// <reference types="vite/client" />
import { supabase } from "@/lib/supabase";

const FUNCTIONS_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");
  return {
    "Authorization": `Bearer ${session.access_token}`,
    "Content-Type": "application/json",
  };
}

export async function sendEmailVerification(): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${FUNCTIONS_BASE}/send-email-verification`, {
    method: "POST",
    headers,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to send email verification");
}

export async function verifyEmailOtp(code: string): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${FUNCTIONS_BASE}/verify-email-otp`, {
    method: "POST",
    headers,
    body: JSON.stringify({ code }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to verify email code");
}

export async function sendPhoneVerification(phone_number: string): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${FUNCTIONS_BASE}/send-phone-verification`, {
    method: "POST",
    headers,
    body: JSON.stringify({ phone_number }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to send SMS");
}

export async function verifyPhoneOtp(code: string): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${FUNCTIONS_BASE}/verify-phone-otp`, {
    method: "POST",
    headers,
    body: JSON.stringify({ code }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to verify phone code");
}
