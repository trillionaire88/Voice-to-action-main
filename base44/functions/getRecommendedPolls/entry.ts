import { createSupabaseContext } from '../lib/supabaseContext.ts';

Deno.serve(async (req) => {
  try {
    const { supabase, supabaseAdmin, entities, adminEntities, integrations, getUser } = createSupabaseContext(req);
    const user = await getUser();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userPrefs = await entities.UserPreferences.filter({ user_id: user.id });
    const favoriteCategories = userPrefs[0]?.favorite_categories || [];

    const allPolls = await entities.Poll.filter({ status: 'open' }, '-total_votes_cached', 50);
    
    const recommendedPolls = allPolls
      .filter(p => favoriteCategories.includes(p.category) || !favoriteCategories.length)
      .slice(0, 6);

    return Response.json({ success: true, polls: recommendedPolls });
  } catch (error) {
    console.error('getRecommendedPolls error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});