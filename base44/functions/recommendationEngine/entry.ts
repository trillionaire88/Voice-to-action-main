import { createSupabaseContext } from '../lib/supabaseContext.ts';

Deno.serve(async (req) => {
  try {
    const { supabase, supabaseAdmin, entities, adminEntities, integrations, getUser } = createSupabaseContext(req);
    const user = await getUser().catch(() => null);
    const body = await req.json().catch(() => ({}));
    const { action } = body;

    // ── Get/update user interests ────────────────────────────────────────
    if (action === 'get_interests') {
      if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
      let interests = await adminEntities.UserInterest.filter({ user_id: user.id });
      if (!interests[0]) {
        const created = await adminEntities.UserInterest.create({
          user_id: user.id, categories: [], tags: [], followed_user_ids: [],
          followed_community_ids: [], followed_issue_tags: [],
          feed_preference: 'trending_first', topic_weights: {},
          last_updated: new Date().toISOString(),
        });
        return Response.json({ interests: created });
      }
      return Response.json({ interests: interests[0] });
    }

    if (action === 'update_interests') {
      if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
      const { categories, tags, followed_user_ids, followed_community_ids, followed_issue_tags, feed_preference, show_verified_only, show_trending, show_communities, country_code, region_code } = body;
      let existing = await adminEntities.UserInterest.filter({ user_id: user.id });
      const data = { last_updated: new Date().toISOString() };
      if (categories !== undefined) data.categories = categories;
      if (tags !== undefined) data.tags = tags;
      if (followed_user_ids !== undefined) data.followed_user_ids = followed_user_ids;
      if (followed_community_ids !== undefined) data.followed_community_ids = followed_community_ids;
      if (followed_issue_tags !== undefined) data.followed_issue_tags = followed_issue_tags;
      if (feed_preference !== undefined) data.feed_preference = feed_preference;
      if (show_verified_only !== undefined) data.show_verified_only = show_verified_only;
      if (show_trending !== undefined) data.show_trending = show_trending;
      if (show_communities !== undefined) data.show_communities = show_communities;
      if (country_code !== undefined) data.country_code = country_code;
      if (region_code !== undefined) data.region_code = region_code;

      if (existing[0]) {
        await adminEntities.UserInterest.update(existing[0].id, data);
      } else {
        await adminEntities.UserInterest.create({ user_id: user.id, ...data });
      }
      return Response.json({ success: true });
    }

    // ── Record topic engagement (auto-learning) ──────────────────────────
    if (action === 'record_engagement') {
      if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
      const { topic, engaged } = body; // engaged: true = clicked, false = ignored
      let existing = await adminEntities.UserInterest.filter({ user_id: user.id });
      if (existing[0]) {
        const weights = existing[0].topic_weights || {};
        const current = weights[topic] || 50;
        weights[topic] = Math.min(100, Math.max(0, current + (engaged ? 10 : -5)));
        await adminEntities.UserInterest.update(existing[0].id, { topic_weights: weights });
      }
      return Response.json({ success: true });
    }

    // ── Generate feed ────────────────────────────────────────────────────
    if (action === 'get_feed') {
      const { feed_type = 'personal', limit = 20 } = body;

      let allContent = await adminEntities.SearchIndex.list('-relevance_score', 300);
      allContent = allContent.filter(c => !c.is_spam && !c.is_flagged);

      let interests = null;
      if (user) {
        const userInterests = await adminEntities.UserInterest.filter({ user_id: user.id });
        interests = userInterests[0];
      }

      // Score each item
      const scored = allContent.map(item => {
        let score = item.relevance_score || 50;

        if (feed_type === 'trending') {
          score = item.is_trending ? score + 40 : score;
          score += (item.activity_score || 0) * 0.5;
        } else if (feed_type === 'local' && interests?.country_code) {
          score += item.country_code === interests.country_code ? 30 : 0;
        } else if (feed_type === 'personal' && interests) {
          // Category match
          if (interests.categories?.includes(item.category)) score += 25;
          // Tag match
          const tagMatch = (item.tags || []).some(t => interests.tags?.includes(t));
          if (tagMatch) score += 20;
          // Location boost
          if (item.country_code && item.country_code === interests.country_code) score += 15;
          // Followed creators
          if (interests.followed_user_ids?.includes(item.creator_user_id)) score += 30;
          // Topic weight
          const tw = interests.topic_weights || {};
          if (tw[item.category]) score += (tw[item.category] - 50) * 0.3;
          // Trending boost
          if (item.is_trending && interests.show_trending !== false) score += 15;
          // Verified filter
          if (interests.show_verified_only && !item.is_verified) score -= 20;
        }

        // Credibility + reputation boost
        score += (item.credibility_score || 50) * 0.1;
        score += (item.reputation_score || 50) * 0.05;

        return { ...item, _feed_score: score };
      });

      scored.sort((a, b) => (b._feed_score || 0) - (a._feed_score || 0));
      return Response.json({ feed: scored.slice(0, limit), feed_type });
    }

    // ── Get similar content ──────────────────────────────────────────────
    if (action === 'get_similar') {
      const { content_id, content_type, limit = 6 } = body;
      const source = await adminEntities.SearchIndex.filter({ content_type, content_id });
      if (!source[0]) return Response.json({ similar: [] });

      const s = source[0];
      let all = await adminEntities.SearchIndex.list('-relevance_score', 200);
      all = all.filter(c => c.id !== s.id && !c.is_spam && !c.is_flagged);

      const similar = all.map(item => {
        let score = 0;
        if (item.category === s.category) score += 30;
        if (item.country_code === s.country_code) score += 15;
        const tagOverlap = (item.tags || []).filter(t => (s.tags || []).includes(t)).length;
        score += tagOverlap * 10;
        return { ...item, _sim_score: score };
      }).filter(i => i._sim_score > 0).sort((a, b) => b._sim_score - a._sim_score).slice(0, limit);

      return Response.json({ similar });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});