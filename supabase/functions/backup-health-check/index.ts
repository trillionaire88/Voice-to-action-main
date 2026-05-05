import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { FROM_SECURITY } from "../_shared/email.ts";
import { siteOrigin } from "../_shared/siteUrl.ts";

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const allowed = siteOrigin();
  const base: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Content-Type": "application/json",
  };
  if (origin && origin === allowed) {
    return { ...base, "Access-Control-Allow-Origin": origin, "Vary": "Origin" };
  }
  return { ...base, "Access-Control-Allow-Origin": allowed };
}

serve(async (req) => {
  const CORS = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const started = Date.now();
  const issues: string[] = [];
  const timingsMs: Record<string, number> = {};

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const now = new Date().toISOString();

  async function timed<T>(name: string, fn: () => Promise<T>) {
    const t0 = Date.now();
    try {
      const v = await fn();
      timingsMs[name] = Date.now() - t0;
      return v;
    } catch (e) {
      timingsMs[name] = Date.now() - t0;
      issues.push(`${name}: ${e instanceof Error ? e.message : String(e)}`);
      return null;
    }
  }

  await timed("admin_audit_log", async () => {
    const { error } = await supabase.from("admin_audit_log").select("id").limit(1);
    if (error) issues.push(`admin_audit_log: ${error.message}`);
    return null;
  });

  await timed("platform_status", async () => {
    const { data, error } = await supabase.from("platform_status").select("id").eq("id", 1).maybeSingle();
    if (error || !data) issues.push("platform_status singleton missing/unreachable");
    return null;
  });

  await timed("petitions", async () => {
    const { error } = await supabase.from("petitions").select("id").limit(1);
    if (error) issues.push(`petitions: ${error.message}`);
    return null;
  });

  await timed("votes", async () => {
    const { error } = await supabase.from("votes").select("id").limit(1);
    if (error) issues.push(`votes: ${error.message}`);
    return null;
  });

  await timed("profiles", async () => {
    const { error } = await supabase.from("profiles").select("id").limit(1);
    if (error) issues.push(`profiles: ${error.message}`);
    return null;
  });

  await timed("petition_signatures", async () => {
    const { error } = await supabase.from("petition_signatures").select("id").limit(1);
    if (error) issues.push(`petition_signatures: ${error.message}`);
    return null;
  });

  const { count: petitionTotal, error: pcErr } = await supabase
    .from("petitions")
    .select("id", { count: "exact", head: true });
  if (pcErr) issues.push(`petitions_count: ${pcErr.message}`);
  else if (petitionTotal === 0) issues.push("sanity: no petitions in database");

  const { count: profileTotal, error: prErr } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true });
  if (prErr) issues.push(`profiles_count: ${prErr.message}`);
  else if (profileTotal === 0) issues.push("sanity: no user profiles in database");

  for (const [k, ms] of Object.entries(timingsMs)) {
    if (ms > 500) issues.push(`slow: ${k} took ${ms}ms (>500ms)`);
  }

  const elapsed = Date.now() - started;
  const ok = issues.length === 0;

  await supabase.from("security_audit_log").insert({
    event_type: "backup_health_check",
    severity: ok ? "info" : "high",
    details: { ok, issues, checked_at: now, timings_ms: timingsMs, elapsed_ms: elapsed },
    created_at: now,
  });

  if (!ok && Deno.env.get("RESEND_API_KEY")) {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_SECURITY,
        to: "jeremywhisson@gmail.com",
        subject: "Backup health check warning",
        text: `Backup health check failed at ${now}\n\n${issues.join("\n")}\n\nTimings: ${JSON.stringify(timingsMs)}`,
      }),
    }).catch(() => {});
  }

  return new Response(JSON.stringify({ ok, issues, checked_at: now, timings_ms: timingsMs, elapsed_ms: elapsed }), {
    headers: CORS,
  });
});
