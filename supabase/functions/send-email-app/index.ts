import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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

/** Lowercase emails allowed for non-privileged users (self + platform inboxes). */
function isAllowlistedRecipient(to: string): boolean {
  const t = to.trim().toLowerCase();
  const fromEnv = (Deno.env.get("TRANSACTIONAL_EMAIL_ALLOWLIST") ?? "")
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
  const set = new Set(fromEnv);
  const owner = Deno.env.get("OWNER_NOTIFY_EMAIL")?.trim().toLowerCase();
  const inbox = Deno.env.get("PLATFORM_INBOX_EMAIL")?.trim().toLowerCase();
  if (owner) set.add(owner);
  if (inbox) set.add(inbox);
  set.add("voicetoaction@outlook.com");
  return set.has(t);
}

/**
 * Authenticated transactional email: validates recipient rules, then calls send-email with the service role.
 * Client must use this instead of invoking send-email directly (send-email is service-role only).
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const ip =
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  const rlIp = await checkRateLimit(ip, "send-email-app-ip", 30, 3600);
  if (!rlIp.allowed) return addCors(rateLimitResponse(rlIp.resetAt));

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authHeader = req.headers.get("Authorization") ?? "";

  const supabaseUser = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authErr } = await supabaseUser.auth.getUser();
  if (authErr || !user?.email) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const rlUser = await checkRateLimit(user.id, "send-email-app-user", 20, 3600);
  if (!rlUser.allowed) return addCors(rateLimitResponse(rlUser.resetAt));

  const supabaseAdmin = createClient(supabaseUrl, serviceKey);
  const { data: profile } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
  const role = profile?.role ?? "user";
  const privileged = ["admin", "moderator", "owner_admin"].includes(role);

  const body = await req.json().catch(() => ({}));
  const to = typeof body.to === "string" ? body.to.trim() : "";
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const text =
    typeof body.body === "string"
      ? body.body
      : typeof body.text === "string"
        ? body.text
        : "";
  const html = typeof body.html === "string" ? body.html : undefined;
  const takedownRequestId = typeof body.takedown_request_id === "string" ? body.takedown_request_id.trim() : "";
  if (!to || !subject || (!text && !html)) {
    return new Response(JSON.stringify({ error: "to, subject, and body or html required" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const toNorm = to.toLowerCase();
  const userEmail = user.email.trim().toLowerCase();

  let takedownRecipientOk = false;
  if (takedownRequestId) {
    const { data: td } = await supabaseAdmin
      .from("takedown_requests")
      .select("email")
      .eq("id", takedownRequestId)
      .maybeSingle();
    const rowEmail = typeof td?.email === "string" ? td.email.trim().toLowerCase() : "";
    takedownRecipientOk = rowEmail !== "" && rowEmail === toNorm;
  }

  const { data: adminRows } = await supabaseAdmin.from("admin_contact_directory").select("email").limit(100);
  const adminEmails = new Set(
    (adminRows ?? [])
      .map((r: { email?: string }) => r.email?.trim().toLowerCase())
      .filter((e): e is string => Boolean(e)),
  );
  const adminInboxOk = adminEmails.has(toNorm);

  const allowed =
    privileged ||
    toNorm === userEmail ||
    isAllowlistedRecipient(toNorm) ||
    adminInboxOk ||
    takedownRecipientOk;
  if (!allowed) {
    return new Response(JSON.stringify({ error: "Recipient not permitted for your account" }), {
      status: 403,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const upstream = await fetch(`${supabaseUrl.replace(/\/+$/, "")}/functions/v1/send-email`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ to, subject, body: text, html }),
  });
  if (!upstream.ok) {
    const err = await upstream.text();
    return new Response(JSON.stringify({ error: err || "Upstream send failed" }), {
      status: 502,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
  const out = await upstream.json().catch(() => ({}));
  return new Response(JSON.stringify(out), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
