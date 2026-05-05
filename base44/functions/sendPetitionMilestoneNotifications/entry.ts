import { createSupabaseContext } from '../lib/supabaseContext.ts';

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const { supabase, supabaseAdmin, entities, adminEntities, integrations, getUser } = createSupabaseContext(req);
    const { petitionId, milestoneType, milestoneValue } = await req.json();

    if (!petitionId) {
      return Response.json({ error: "Missing petitionId" }, { status: 400 });
    }

    // Fetch petition
    const petitions = await adminEntities.Petition.filter({ id: petitionId });
    if (!petitions.length) {
      return Response.json({ error: "Petition not found" }, { status: 404 });
    }
    const petition = petitions[0];

    // Fetch creator
    const creators = await adminEntities.User.filter({ id: petition.creator_user_id });
    if (!creators.length) {
      console.log(`Creator not found for petition ${petitionId}`);
      return Response.json({ success: false, message: "Creator not found" });
    }
    const creator = creators[0];

    // Send notification to creator
    let subject = "";
    let body = "";

    if (milestoneType === "signature_milestone") {
      subject = `🎉 Milestone Reached: ${milestoneValue.toLocaleString()} Signatures!`;
      body = `Your petition "${petition.title}" has reached ${milestoneValue.toLocaleString()} signatures!\n\nKeep sharing to reach your goal of ${petition.signature_goal?.toLocaleString() || "unlimited"} signatures.\n\nView your petition: ${Deno.env.get("APP_URL") || "https://voicetoaction.com"}/PetitionDetail?id=${petitionId}`;
    } else if (milestoneType === "delivered") {
      subject = `✅ Your Petition Was Delivered!`;
      body = `Congratulations! Your petition "${petition.title}" has been officially delivered to ${petition.target_name}.\n\nYour voice made a difference. Thank you for taking action!`;
    }

    if (subject && creator.email) {
      await integrations.Core.SendEmail({
        to: creator.email,
        subject,
        body,
      });
      console.log(`Milestone notification sent to ${creator.email} for petition ${petitionId}`);
    }

    return Response.json({ success: true, notificationSent: true });
  } catch (error) {
    console.error("Error in sendPetitionMilestoneNotifications:", error);
    return Response.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
});