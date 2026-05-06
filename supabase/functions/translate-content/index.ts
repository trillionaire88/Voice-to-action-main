import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Anthropic from "npm:@anthropic-ai/sdk@0.27.3";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, rateLimitResponse } from "../_shared/rateLimiter.ts";
import { siteOrigin } from "../_shared/siteUrl.ts";

const cors = {
  "Access-Control-Allow-Origin": siteOrigin(),
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function addCors(base: Response): Response {
  const h = new Headers(base.headers);
  for (const [k, v] of Object.entries(cors)) h.set(k, v);
  return new Response(base.body, { status: base.status, headers: h });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const ip =
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  const rlIp = await checkRateLimit(ip, "translate-content-ip", 10, 60);
  if (!rlIp.allowed) return addCors(rateLimitResponse(rlIp.resetAt));

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const authHeader = req.headers.get("Authorization") ?? "";
  const supabaseUser = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authErr } = await supabaseUser.auth.getUser();
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const rlUser = await checkRateLimit(user.id, "translate-content-user", 30, 60);
  if (!rlUser.allowed) return addCors(rateLimitResponse(rlUser.resetAt));

  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) {
    return new Response(JSON.stringify({ translated: "" }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const { content = "", targetLanguage = "en" } = await req.json().catch(() => ({}));
  const text = String(content).slice(0, 8000);
  const client = new Anthropic({ apiKey: key });
  const msg = await client.messages.create({
    model: "claude-3-5-haiku-latest",
    max_tokens: 1000,
    messages: [{ role: "user", content: `Translate this to ${targetLanguage}: ${text}` }],
  });
  const translated = msg.content?.[0]?.type === "text" ? msg.content[0].text : "";
  return new Response(JSON.stringify({ translated }), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
