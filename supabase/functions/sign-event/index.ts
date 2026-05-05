import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function sha256hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  const internalSecret = req.headers.get("x-internal-secret");
  const expected = Deno.env.get("INTERNAL_FUNCTION_SECRET");
  if (!expected || internalSecret !== expected) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const body = await req.json().catch(() => ({}));
  const { event_type, actor_id, subject_id, subject_type, payload, ip_address } = body as Record<
    string,
    unknown
  >;

  if (!event_type || typeof event_type !== "string") {
    return new Response(JSON.stringify({ error: "event_type required" }), {
      status: 400,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const { data: lastRow } = await supabase
    .from("event_chain")
    .select("sequence_num, row_hash")
    .order("sequence_num", { ascending: false })
    .limit(1)
    .maybeSingle();

  const prevHash =
    lastRow?.row_hash ||
    "0000000000000000000000000000000000000000000000000000000000000000";
  const nextSeq = (lastRow?.sequence_num ?? 0) + 1;

  const payloadStr = JSON.stringify(payload ?? {});
  const rowData = `${nextSeq}|${event_type}|${payloadStr}|${prevHash}`;
  const rowHash = await sha256hex(rowData);

  const safePayload =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : {};

  const { error } = await supabase.from("event_chain").insert({
    sequence_num: nextSeq,
    event_type,
    actor_id: (actor_id as string | null) ?? null,
    subject_id: (subject_id as string | null) ?? null,
    subject_type: (subject_type as string | null) ?? null,
    payload: safePayload,
    ip_address: (ip_address as string | null) ?? null,
    prev_hash: prevHash,
    row_hash: rowHash,
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.error("[sign-event] Chain write error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({ success: true, sequence_num: nextSeq, row_hash: rowHash }),
    { headers: { ...CORS, "Content-Type": "application/json" } },
  );
});
