import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Anthropic from "npm:@anthropic-ai/sdk@0.27.3";
import { SECURITY_HEADERS } from "../_shared/securityMiddleware.ts";

function emptyFromSchema(schema: { properties?: Record<string, { type?: string }> } | undefined): Record<string, unknown> {
  const props = schema?.properties;
  if (!props) return {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props)) {
    const type = v?.type;
    if (type === "array") out[k] = [];
    else if (type === "number") out[k] = 0;
    else if (type === "object") out[k] = {};
    else out[k] = "";
  }
  return out;
}

/**
 * Internal LLM proxy — service role only. Used by base44 integrations.Core.InvokeLLM.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: SECURITY_HEADERS });

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const auth = req.headers.get("Authorization") || "";
  if (!serviceKey || auth !== `Bearer ${serviceKey}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...SECURITY_HEADERS, "Content-Type": "application/json" },
    });
  }

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), {
      status: 503,
      headers: { ...SECURITY_HEADERS, "Content-Type": "application/json" },
    });
  }

  const body = await req.json().catch(() => ({}));
  const prompt = typeof body.prompt === "string" ? body.prompt : "";
  if (!prompt) {
    return new Response(JSON.stringify({ error: "prompt required" }), {
      status: 400,
      headers: { ...SECURITY_HEADERS, "Content-Type": "application/json" },
    });
  }

  const schema = body.response_json_schema as { properties?: Record<string, { type?: string }> } | undefined;
  const client = new Anthropic({ apiKey });
  const model = Deno.env.get("ANTHROPIC_MODEL") || "claude-3-5-haiku-latest";
  const userMsg = `${prompt}\n\nRespond with a single JSON object only. No markdown fences, no commentary.`;
  const msg = await client.messages.create({
    model,
    max_tokens: 4096,
    messages: [{ role: "user", content: userMsg }],
  });
  const text = msg.content?.[0]?.type === "text" ? msg.content[0].text : "";
  let parsed: Record<string, unknown> = {};
  try {
    const trimmed = text.replace(/```json\n?|\n?```/g, "").trim();
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    const slice = start >= 0 && end > start ? trimmed.slice(start, end + 1) : trimmed;
    parsed = JSON.parse(slice || "{}");
  } catch {
    parsed = {};
  }
  const defaults = emptyFromSchema(schema);
  const merged = { ...defaults, ...parsed };
  return new Response(JSON.stringify(merged), {
    headers: { ...SECURITY_HEADERS, "Content-Type": "application/json" },
  });
});
