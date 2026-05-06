import { createSupabaseContext } from '../lib/supabaseContext.ts';

Deno.serve(async (req) => {
  try {
    const { supabase, supabaseAdmin, entities, adminEntities, integrations, getUser } = createSupabaseContext(req);
    const user = await getUser();

    if (user?.role !== 'admin' && user?.role !== 'owner_admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const petitions = await entities.Petition.filter({ status: 'active' }, null, 1000);
    let updatedCount = 0;

    for (const petition of petitions) {
      const signatures = petition.signature_count_total || 0;
      const goal = petition.signature_goal || 1;
      const comments = petition.comments_count || 0;
      
      const signatureComponent = Math.min((signatures / goal) * 40, 40);
      const engagementComponent = Math.min(comments / 100 * 30, 30);
      const deliveryComponent = petition.status === 'delivered' ? 30 : 0;
      
      const impactScore = signatureComponent + engagementComponent + deliveryComponent;

      const existing = await entities.PetitionImpactScore.filter({ petition_id: petition.id });
      
      if (existing.length) {
        await adminEntities.PetitionImpactScore.update(existing[0].id, {
          impact_score: impactScore,
          signature_impact: signatureComponent,
          engagement_impact: engagementComponent,
          delivery_impact: deliveryComponent,
          last_calculated_at: new Date().toISOString()
        });
      } else {
        await adminEntities.PetitionImpactScore.create({
          petition_id: petition.id,
          impact_score: impactScore,
          signature_impact: signatureComponent,
          engagement_impact: engagementComponent,
          delivery_impact: deliveryComponent,
          last_calculated_at: new Date().toISOString()
        });
      }
      updatedCount++;
    }

    return Response.json({ success: true, petitionsUpdated: updatedCount });
  } catch (error) {
    console.error('calculatePetitionImpactScores error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});