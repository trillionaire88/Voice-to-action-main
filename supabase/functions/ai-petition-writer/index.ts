import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Anthropic from "npm:@anthropic-ai/sdk@0.27.3";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SYSTEM = `You are an expert civic advocate and petition writer. You help citizens write clear, compelling, and legally appropriate petitions that drive real change. Your writing is passionate but professional, specific but accessible. You understand Australian civic processes but also global issues. Never suggest illegal actions. Always focus on achievable, specific demands.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok");
  const auth = req.headers.get("Authorization") || "";
  const supabase = createClient(Deno.env.get("SUPABASE_URL") || "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "");
  const token = auth.replace("Bearer ", "");
  const { data: userData } = await supabase.auth.getUser(token);
  const user = userData?.user;
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: logs = [] } = await supabase.from("security_audit_log").select("id").eq("user_id", user.id).eq("event_type", "ai_petition_writer").gte("created_at", since);
  if ((logs || []).length >= 10) return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429 });

  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) return new Response(JSON.stringify({ error: "AI unavailable" }), { status: 503 });
  const client = new Anthropic({ apiKey: key });
  const body = await req.json().catch(() => ({}));
  const action = body.action || "generate_petition";
  const prompt = `Action: ${action}\nInput: ${JSON.stringify(body)}`;
  const msg = await client.messages.create({
    model: "claude-3-5-haiku-latest",
    max_tokens: 1200,
    system: SYSTEM,
    messages: [{ role: "user", content: prompt }],
  });
  await supabase.from("security_audit_log").insert({ user_id: user.id, event_type: "ai_petition_writer", metadata: { action } });
  return new Response(JSON.stringify({ result: msg.content?.[0]?.type === "text" ? msg.content[0].text : "" }), {
    headers: { "content-type": "application/json" },
  });
});
