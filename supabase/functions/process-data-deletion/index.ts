import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const token = authHeader.replace("Bearer ", "");
  const {
    data: { user },
  } = await supabase.auth.getUser(token);
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { action } = await req.json().catch(() => ({}));

  if (action === "request") {
    const { data: existing } = await supabase
      .from("data_deletion_requests")
      .select("id, status")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({
          message: "You already have a pending deletion request. It will be processed within 30 days.",
          request_id: existing.id,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: request, error: insertErr } = await supabase
      .from("data_deletion_requests")
      .insert({
        user_id: user.id,
        user_email: user.email || "",
        request_type: "full_erasure",
        status: "pending",
      })
      .select()
      .single();

    if (insertErr) {
      return new Response(JSON.stringify({ error: insertErr.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    const supportEmail = Deno.env.get("SUPPORT_EMAIL") ?? "support@voicetoaction.io";
    const ownerInbox =
      Deno.env.get("OWNER_NOTIFY_EMAIL")?.trim() || supportEmail;
    if (resendKey) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Voice to Action <noreply@voicetoaction.io>",
          to: ownerInbox,
          subject: `[Data Deletion Request] ${user.email}`,
          text: `A user has requested full data erasure.\n\nUser: ${user.email}\nID: ${user.id}\nRequest ID: ${request?.id}\nTime: ${new Date().toISOString()}\n\nThis must be processed within 30 days under the Australian Privacy Act 1988.\n\nReview at your admin dashboard.`,
        }),
      }).catch(() => {});

      if (user.email) {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Voice to Action <noreply@voicetoaction.io>",
            to: user.email,
            subject: "Your data deletion request has been received",
            text: `Hi,\n\nWe have received your request to delete your Voice to Action account and associated data.\n\nRequest ID: ${request?.id}\nSubmitted: ${new Date().toLocaleString("en-AU", { timeZone: "Australia/Sydney" })}\n\nUnder the Australian Privacy Act 1988, we will process your request within 30 days.\n\nYou will receive a confirmation email once your data has been deleted.\n\nVoice to Action\n${supportEmail}`,
          }),
        }).catch(() => {});
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Data deletion request submitted. You will be contacted within 30 days.",
        request_id: request?.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  return new Response(JSON.stringify({ error: "Unknown action" }), {
    status: 400,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
