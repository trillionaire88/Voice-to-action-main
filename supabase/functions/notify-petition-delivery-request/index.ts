import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { FROM_NOREPLY } from "../_shared/email.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { delivery_id } = await req.json().catch(() => ({}));
    if (!delivery_id || typeof delivery_id !== "string") {
      return new Response(JSON.stringify({ error: "delivery_id required" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { data: delivery, error: dErr } = await supabase
      .from("petition_deliveries")
      .select("*")
      .eq("id", delivery_id)
      .maybeSingle();

    if (dErr || !delivery) {
      return new Response(JSON.stringify({ error: "Delivery not found" }), {
        status: 404,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { data: petition } = await supabase
      .from("petitions")
      .select("id, title, creator_user_id, signature_count_total, signature_count_verified")
      .eq("id", delivery.petition_id)
      .maybeSingle();

    if (!petition || petition.creator_user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const rawStatus = (delivery as Record<string, unknown>).delivery_status;
    if (rawStatus != null && rawStatus !== "" && rawStatus !== "awaiting_owner_review") {
      return new Response(JSON.stringify({ error: "Invalid delivery state" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const ownerTo = Deno.env.get("OWNER_NOTIFY_EMAIL")?.trim() ||
      Deno.env.get("SUPPORT_EMAIL")?.trim() ||
      "support@voicetoaction.io";
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      console.error("[notify-petition-delivery-request] RESEND_API_KEY missing");
      return new Response(JSON.stringify({ error: "Email not configured" }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const org =
      (delivery as Record<string, unknown>).recipient_organisation ||
      (delivery as Record<string, unknown>).institution_name ||
      "Unknown recipient";
    const dept = String((delivery as Record<string, unknown>).recipient_department || "");
    const email = String((delivery as Record<string, unknown>).recipient_email || (delivery as Record<string, unknown>).institution_email || "");

    const title = petition.title || "Petition";
    const total = petition.signature_count_total ?? "—";
    const verified = petition.signature_count_verified ?? "—";

    const text =
      `A petition has reached a delivery milestone and the creator is requesting official delivery.\n\n` +
      `Petition: ${title}\n` +
      `Target: ${org}${dept ? ` / ${dept}` : ""}\n` +
      `Email: ${email || "Not provided"}\n` +
      `Signatures: ${total} total / ${verified} verified\n\n` +
      `Please review and approve delivery in the Master Admin panel.`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_NOREPLY,
        to: ownerTo,
        subject: `📬 Petition Delivery Request: ${title}`,
        text,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[notify-petition-delivery-request] Resend:", err);
      return new Response(JSON.stringify({ error: "Failed to send notification email" }), {
        status: 502,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[notify-petition-delivery-request]", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
