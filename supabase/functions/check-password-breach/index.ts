import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rateLimiter.ts";
import { siteOrigin } from "../_shared/siteUrl.ts";

const CORS = {
  "Access-Control-Allow-Origin": siteOrigin(),
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || "unknown";
  const rl = await checkRateLimit(ip, "check-password-breach", 5, 60);
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  const body = await req.json().catch(() => ({}));
  const prefix = String(body.passwordHash || "").toUpperCase();
  const suffix = String(body.suffix || "").toUpperCase();
  if (!/^[A-F0-9]{5}$/.test(prefix)) {
    return new Response(JSON.stringify({ breached: false, count: 0, error: "Invalid prefix" }), {
      status: 400,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
  const text = await response.text();
  let breached = false;
  let count = 0;
  if (suffix) {
    for (const line of text.split("\n")) {
      const [candidate, cnt] = line.trim().split(":");
      if (candidate?.toUpperCase() === suffix) {
        breached = true;
        count = Number(cnt || 0);
        break;
      }
    }
  }

  return new Response(JSON.stringify({ breached, count }), {
    headers: { ...CORS, "Content-Type": "application/json" },
  });
});
