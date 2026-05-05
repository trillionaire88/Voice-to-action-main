import { createSupabaseContext } from '../lib/supabaseContext.ts';

/**
 * petitionDeliveryTracker — tracks delivery status and handles escalation
 */
Deno.serve(async (req) => {
  try {
    const { supabase, supabaseAdmin, entities, adminEntities, integrations, getUser } = createSupabaseContext(req);
    const body = await req.json().catch(() => ({}));
    const { action = 'check_escalations' } = body;

    if (action === 'check_escalations') {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const deliveries = await adminEntities.PetitionDelivery.filter({ status: 'delivered' });
      const overdue = deliveries.filter(d => d.delivered_at && d.delivered_at < thirtyDaysAgo && !d.response_received);

      let escalated = 0;
      for (const delivery of overdue.slice(0, 50)) {
        await adminEntities.PetitionDelivery.update(delivery.id, {
          status: 'no_response',
          escalation_due: true,
          escalation_note: `No response received within 30 days of delivery on ${delivery.delivered_at}`,
        }).catch(() => {});

        if (delivery.petition_id) {
          const petitions = await adminEntities.Petition.filter({ id: delivery.petition_id });
          const petition = petitions[0];
          if (petition?.creator_user_id) {
            await adminEntities.Notification.create({
              user_id: petition.creator_user_id,
              type: 'milestone',
              title: '30 days — No response to your petition',
              body: `Your petition "${petition.title?.slice(0, 60)}" was delivered 30 days ago with no response. You can now escalate to the next level of authority.`,
              action_url: `/PetitionDetail?id=${delivery.petition_id}`,
              is_read: false,
              data: { petition_id: delivery.petition_id, escalation: true },
            }).catch(() => {});
          }
        }
        escalated++;
      }

      console.log(`[PetitionDeliveryTracker] Escalated ${escalated} overdue deliveries`);
      return Response.json({ success: true, escalated, checked: overdue.length });
    }

    if (action === 'record_delivery') {
      const { petition_id, target_name, target_email, delivery_method, delivered_at } = body;
      if (!petition_id) return Response.json({ error: 'petition_id required' }, { status: 400 });

      const existing = await adminEntities.PetitionDelivery.filter({ petition_id });
      if (existing.length > 0) {
        await adminEntities.PetitionDelivery.update(existing[0].id, {
          status: 'delivered', delivered_at: delivered_at || new Date().toISOString(),
          target_name, target_email, delivery_method, response_received: false,
        });
      } else {
        await adminEntities.PetitionDelivery.create({
          petition_id, target_name, target_email, delivery_method,
          status: 'delivered', delivered_at: delivered_at || new Date().toISOString(),
          response_received: false,
        });
      }

      await adminEntities.Petition.update(petition_id, {
        status: 'delivered', delivery_date: new Date().toISOString(),
      }).catch(() => {});

      return Response.json({ success: true });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });

  } catch (error) {
    console.error('[PetitionDeliveryTracker] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});