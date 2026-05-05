import { createSupabaseContext } from '../lib/supabaseContext.ts';

Deno.serve(async (req) => {
  try {
    const { supabase, supabaseAdmin, entities, adminEntities, integrations, getUser } = createSupabaseContext(req);
    const { petitionId, category } = await req.json();

    if (!petitionId || !category) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const petition = await entities.Petition.filter({ id: petitionId });
    if (!petition.length) {
      return Response.json({ error: 'Petition not found' }, { status: 404 });
    }

    const userPrefs = await entities.UserPreferences.filter({});
    const preferenceMap = Object.fromEntries(userPrefs.map(p => [p.user_id, p.favorite_categories || []]));

    let notificationCount = 0;
    for (const [userId, categories] of Object.entries(preferenceMap)) {
      if (categories.includes(category)) {
        await vta.asServiceRole.functions.invoke('createNotification', {
          userId,
          title: `New petition in ${category}`,
          message: `A new petition about ${category} has been created: "${petition[0].title}"`,
          link: `/PetitionDetail?id=${petitionId}`,
          type: 'new_petition_category',
          data: { petitionId, category }
        });
        notificationCount++;
      }
    }

    return Response.json({ success: true, notificationsCreated: notificationCount });
  } catch (error) {
    console.error('notifyCategoryFollowers error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});