import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function hmacSha256(key: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const msgData = encoder.encode(message);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, msgData);
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const body = await req.json().catch(() => ({}));
  const { petition_id, action, receipt_hash } = body as Record<string, string | undefined>;

  if (action === "generate") {
    if (!petition_id) {
      return new Response(JSON.stringify({ error: "petition_id required" }), {
        status: 400,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const { data: sig, error: sigErr } = await supabase
      .from("petition_signatures")
      .select("petition_id, user_id, signer_name, is_anonymous, is_verified_user, created_at")
      .eq("petition_id", petition_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (sigErr || !sig) {
      return new Response(JSON.stringify({ error: "No signature found for this petition" }), {
        status: 404,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const { data: existing } = await supabase
      .from("petition_receipts")
      .select("receipt_hash")
      .eq("petition_id", petition_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing?.receipt_hash) {
      return new Response(
        JSON.stringify({ receipt_hash: existing.receipt_hash, already_existed: true }),
        { headers: { ...CORS, "Content-Type": "application/json" } },
      );
    }

    const { data: pet } = await supabase.from("petitions").select("title").eq("id", petition_id).maybeSingle();

    const RECEIPT_SECRET = Deno.env.get("RECEIPT_SIGNING_SECRET") || "fallback-secret-change-me";
    const timestamp = sig.created_at || new Date().toISOString();
    const message = `${petition_id}|${user.id}|${timestamp}|VOICE-TO-ACTION`;
    const receiptHash = await hmacSha256(RECEIPT_SECRET, message);

    const { error: insertErr } = await supabase.from("petition_receipts").insert({
      petition_id,
      user_id: user.id,
      receipt_hash: receiptHash,
      signed_at: timestamp,
      petition_title: pet?.title || "",
      signer_name: sig.signer_name || user.email || "",
      is_anonymous: sig.is_anonymous || false,
      verified: !!sig.is_verified_user,
    });

    if (insertErr) {
      console.error("[receipt] Insert error:", insertErr);
      return new Response(JSON.stringify({ error: "Failed to generate receipt" }), {
        status: 500,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        receipt_hash: receiptHash,
        petition_id,
        signed_at: timestamp,
        verify_url: `https://voicetoaction.io/VerifySignature?receipt=${receiptHash}`,
      }),
      { headers: { ...CORS, "Content-Type": "application/json" } },
    );
  }

  if (action === "verify") {
    if (!receipt_hash) {
      return new Response(JSON.stringify({ error: "receipt_hash required" }), {
        status: 400,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const { data: receipt } = await supabase
      .from("petition_receipts")
      .select("*")
      .eq("receipt_hash", receipt_hash)
      .maybeSingle();

    if (!receipt) {
      return new Response(JSON.stringify({ valid: false, reason: "Receipt not found" }), {
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        valid: true,
        petition_id: receipt.petition_id,
        petition_title: receipt.petition_title,
        signed_at: receipt.signed_at,
        is_anonymous: receipt.is_anonymous,
        verified_signer: receipt.verified,
      }),
      { headers: { ...CORS, "Content-Type": "application/json" } },
    );
  }

  return new Response(JSON.stringify({ error: "Unknown action" }), {
    status: 400,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
});
