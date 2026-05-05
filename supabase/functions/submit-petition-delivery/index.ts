import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toUTCString();
  } catch {
    return String(iso);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUser = createClient(supabaseUrl, anon, {
      global: { headers: { Authorization: authHeader } },
    });
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const {
      data: { user },
      error: userErr,
    } = await supabaseUser.auth.getUser(token);
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const petition_id = body.petition_id as string | undefined;
    const email_choice = body.email_choice as string | undefined;
    if (!petition_id || (email_choice !== "creator" && email_choice !== "platform")) {
      return new Response(JSON.stringify({ error: "petition_id and email_choice (creator|platform) required" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { data: petition, error: pErr } = await supabaseAdmin
      .from("petitions")
      .select("*")
      .eq("id", petition_id)
      .maybeSingle();

    if (pErr || !petition) {
      return new Response(JSON.stringify({ error: "Petition not found" }), {
        status: 404,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    if (petition.creator_user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { data: signatures } = await supabaseAdmin
      .from("signatures")
      .select("*")
      .eq("petition_id", petition_id)
      .eq("is_verified_user", true);

    const sigRows = signatures || [];
    const signatureList = sigRows
      .map((sig: Record<string, unknown>, idx: number) => {
        const country = String(sig.country_code || "—");
        const signed = fmtDate(sig.created_date as string);
        return `Signatory #${idx + 1} — Country: ${country}, Signed: ${signed}`;
      })
      .join("\n");

    const emailContent =
      `Petition Submission: ${petition.title}\n\n` +
      `Target: ${petition.target_name} (${petition.target_type})\n` +
      `Category: ${petition.category}\n` +
      `Location: ${petition.country_code}${petition.region_code ? `, ${petition.region_code}` : ""}\n\n` +
      `Total Signatures: ${petition.signature_count_total}\n` +
      `Verified Signatures: ${petition.signature_count_verified}\n\n` +
      `Requested Action:\n${petition.requested_action}\n\n` +
      `Full Description:\n${petition.full_description}\n\n` +
      `VERIFIED SIGNATORIES (${sigRows.length}):\n${signatureList}\n\n` +
      `Created: ${fmtDate(petition.created_date)}\n`;

    const recipientEmail =
      email_choice === "platform"
        ? (Deno.env.get("OWNER_NOTIFY_EMAIL") || "voicetoaction@outlook.com").trim()
        : user.email || "";

    if (!recipientEmail) {
      return new Response(JSON.stringify({ error: "Recipient email unavailable" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      console.error("[submit-petition-delivery] RESEND_API_KEY missing");
      return new Response(JSON.stringify({ error: "Email not configured" }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Voice to Action <noreply@voicetoaction.io>",
        to: recipientEmail,
        subject: `Petition Ready for Delivery: ${petition.title}`,
        text: emailContent,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[submit-petition-delivery] Resend:", err);
      return new Response(JSON.stringify({ error: "Failed to send delivery email" }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const delivered_at = new Date().toISOString();
    const { error: upErr } = await supabaseAdmin
      .from("petitions")
      .update({
        status: "delivered",
        delivered_at,
        delivery_method: "email",
      })
      .eq("id", petition_id);

    if (upErr) {
      console.error("[submit-petition-delivery] petition update:", upErr);
      return new Response(JSON.stringify({ error: "Email sent but failed to update petition" }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, sent_to: recipientEmail }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[submit-petition-delivery]", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
