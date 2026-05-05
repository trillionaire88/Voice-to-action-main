import { createClient } from "npm:@supabase/supabase-js@2.99.3";

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

export async function checkRateLimit(
  identifier: string,
  endpoint: string,
  maxRequests: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const key = `${endpoint}:${identifier}`;
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowSeconds * 1000);

  const { data, error } = await supabase
    .from("rate_limit_store")
    .upsert(
      {
        key,
        count: 1,
        window_start: now.toISOString(),
        updated_at: now.toISOString(),
      },
      {
        onConflict: "key",
        ignoreDuplicates: false,
      },
    )
    .select()
    .single();

  if (error) {
    return { allowed: true, remaining: maxRequests, resetAt: now };
  }

  const resetAt = new Date(data.window_start);
  resetAt.setSeconds(resetAt.getSeconds() + windowSeconds);

  if (new Date(data.window_start) < windowStart) {
    await supabase
      .from("rate_limit_store")
      .update({ count: 1, window_start: now.toISOString() })
      .eq("key", key);
    return { allowed: true, remaining: maxRequests - 1, resetAt };
  }

  if (data.count > maxRequests) {
    return { allowed: false, remaining: 0, resetAt };
  }

  await supabase
    .from("rate_limit_store")
    .update({ count: data.count + 1, updated_at: now.toISOString() })
    .eq("key", key);

  return { allowed: true, remaining: Math.max(0, maxRequests - data.count), resetAt };
}

export function rateLimitResponse(resetAt: Date): Response {
  return new Response(
    JSON.stringify({ error: "Too many requests. Please try again later." }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": Math.max(1, Math.ceil((resetAt.getTime() - Date.now()) / 1000)).toString(),
        "X-RateLimit-Limit": "0",
        "X-RateLimit-Remaining": "0",
      },
    },
  );
}
