import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Anthropic from "npm:@anthropic-ai/sdk@0.27.3";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok");
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) return new Response(JSON.stringify({ translated: "" }), { headers: { "content-type": "application/json" } });
  const { content = "", targetLanguage = "en" } = await req.json().catch(() => ({}));
  const client = new Anthropic({ apiKey: key });
  const msg = await client.messages.create({
    model: "claude-3-5-haiku-latest",
    max_tokens: 1000,
    messages: [{ role: "user", content: `Translate this to ${targetLanguage}: ${content}` }],
  });
  const translated = msg.content?.[0]?.type === "text" ? msg.content[0].text : "";
  return new Response(JSON.stringify({ translated }), { headers: { "content-type": "application/json" } });
});
