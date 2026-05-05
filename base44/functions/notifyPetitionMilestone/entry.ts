import { createSupabaseContext } from '../lib/supabaseContext.ts';

Deno.serve(async (req) => {
  try {
    const { supabase, supabaseAdmin, entities, adminEntities, integrations, getUser } = createSupabaseContext(req);
    const { petitionId, currentSignatures, goalSignatures } = await req.json();

    if (!petitionId || !currentSignatures || !goalSignatures) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const petitions = await adminEntities.Petition.filter({ id: petitionId });
    const petition = petitions[0];
    if (!petition) return Response.json({ error: 'Petition not found' }, { status: 404 });

    const percentage = (currentSignatures / goalSignatures) * 100;
    const milestones = [25, 50, 75, 90, 100];
    let notificationsSent = 0;

    for (const milestone of milestones) {
      const prevPercentage = ((currentSignatures - 1) / goalSignatures) * 100;
      if (percentage >= milestone && prevPercentage < milestone) {
        if (petition.creator_user_id) {
          await adminEntities.Notification.create({
            user_id: petition.creator_user_id,
            type: 'milestone',
            title: `${milestone}% of your goal reached!`,
            body: `Your petition "${petition.title?.slice(0, 60)}" has reached ${milestone}% of its signature goal.`,
            action_url: `/PetitionDetail?id=${petitionId}`,
            is_read: false,
            data: { milestone, petitionId, currentSignatures, goalSignatures },
          });
          notificationsSent++;
        }

        const signatures = await adminEntities.PetitionSignature.filter(
          { petition_id: petitionId, is_invalidated: false, has_withdrawn: false }
        );
        const signerIds = [...new Set(signatures.map(s => s.user_id).filter(Boolean))].slice(0, 200);

        for (const signerUserId of signerIds) {
          if (signerUserId === petition.creator_user_id) continue;
          await adminEntities.Notification.create({
            user_id: signerUserId,
            type: 'milestone',
            title: `Petition at ${milestone}% of goal`,
            body: `"${petition.title?.slice(0, 60)}" has reached ${milestone}% of its signature goal!`,
            action_url: `/PetitionDetail?id=${petitionId}`,
            is_read: false,
            data: { milestone, petitionId },
          }).catch(() => {});
          notificationsSent++;
        }
        break;
      }
    }

    return Response.json({ success: true, notificationsSent });
  } catch (error) {
    console.error('[notifyPetitionMilestone] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});