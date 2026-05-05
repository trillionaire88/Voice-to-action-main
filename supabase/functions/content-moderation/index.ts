import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, rateLimitResponse } from "../_shared/rateLimiter.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BLOCKLIST = [
  "kill yourself",
  "nazi",
  "terrorist manifesto",
  "child abuse material",
  "credit card dump",
  "buy followers now",
  "free crypto giveaway",
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || "unknown";
  const rl = await checkRateLimit(ip, "content-moderation", 20, 60);
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  const body = await req.json().catch(() => ({}));
  const content = String(body.content || "");
  const contentType = String(body.contentType || "unknown");
  const contentId = String(body.contentId || "");
  const text = content.toLowerCase();
  const reasons: string[] = [];

  for (const term of BLOCKLIST) {
    if (text.includes(term)) reasons.push(`blocklist:${term}`);
  }
  if (/(\+61|0)[2-9]\d{8}/.test(content.replace(/\s/g, ""))) reasons.push("contains_phone");
  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(content)) reasons.push("contains_email");
  if (/\b(?:\d[ -]*?){13,19}\b/.test(content)) reasons.push("contains_card_like_number");
  if (/\b\d{10}\b/.test(content)) reasons.push("contains_medicare_like_number");

  let severity: "low" | "medium" | "high" = "low";
  if (reasons.length >= 3 || reasons.some((r) => r.startsWith("blocklist:"))) severity = "high";
  else if (reasons.length > 0) severity = "medium";

  const flagged = reasons.length > 0;

  if (flagged && severity === "high") {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    await supabase.from("security_audit_log").insert({
      event_type: "auto_moderation_flag",
      severity: "high",
      details: { contentType, contentId, reasons },
      ip_address: ip,
    });
  }

  return new Response(JSON.stringify({ flagged, reasons, severity }), {
    headers: { ...CORS, "Content-Type": "application/json" },
  });
});
