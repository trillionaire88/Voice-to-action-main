import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { FROM_NOREPLY } from "../_shared/email.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_AGE_MS = 20 * 60 * 1000;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const { takedown_request_id } = await req.json().catch(() => ({}));
    if (!takedown_request_id || typeof takedown_request_id !== "string") {
      return new Response(JSON.stringify({ error: "takedown_request_id required" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { data: row, error: rowErr } = await supabaseAdmin
      .from("takedown_requests")
      .select(
        "id, complaint_id, full_name, email, phone, country, organisation, content_url, content_description, complaint_category, status, created_at, created_date",
      )
      .eq("id", takedown_request_id)
      .maybeSingle();

    if (rowErr || !row) {
      return new Response(JSON.stringify({ error: "Takedown request not found" }), {
        status: 404,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const rec = row as Record<string, unknown>;
    const createdRaw = rec.created_at ?? rec.created_date;
    if (createdRaw) {
      const created = new Date(String(createdRaw)).getTime();
      if (Number.isFinite(created) && Date.now() - created > MAX_AGE_MS) {
        return new Response(JSON.stringify({ error: "Request too old to notify" }), {
          status: 400,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }
    }

    const ownerTo = Deno.env.get("OWNER_NOTIFY_EMAIL");
    if (!ownerTo?.trim()) {
      console.error("[notify-takedown-request] OWNER_NOTIFY_EMAIL not set");
      return new Response(JSON.stringify({ error: "Owner notification not configured" }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      console.error("[notify-takedown-request] RESEND_API_KEY missing");
      return new Response(JSON.stringify({ error: "Email not configured" }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const complaintId = String(rec.complaint_id ?? "");
    const text =
      `A new Notice and Takedown request has been submitted.\n\n` +
      `Complaint ID: ${complaintId}\n` +
      `--- COMPLAINANT ---\n` +
      `Name: ${rec.full_name}\n` +
      `Email: ${rec.email}\n` +
      `Phone: ${rec.phone || "Not provided"}\n` +
      `Country: ${rec.country}\n` +
      `Organisation: ${rec.organisation || "N/A"}\n\n` +
      `--- COMPLAINT ---\n` +
      `Category: ${rec.complaint_category}\n` +
      `Content URL: ${rec.content_url}\n\n` +
      `Description:\n${rec.content_description}\n\n` +
      `Review in Master Admin → Takedown Requests.`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_NOREPLY,
        to: ownerTo.trim(),
        subject: `New Legal Complaint [${complaintId}] — Voice to Action`,
        text,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[notify-takedown-request] Resend:", err);
      return new Response(JSON.stringify({ error: "Failed to send owner notification" }), {
        status: 502,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[notify-takedown-request]", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
