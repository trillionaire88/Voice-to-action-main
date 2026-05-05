import { createSupabaseContext } from '../lib/supabaseContext.ts';

/**
 * indexContent — called after any content is created or updated.
 * Adds/updates the item in the SearchIndex so it appears in search results instantly.
 */
Deno.serve(async (req) => {
  try {
    const { supabase, supabaseAdmin, entities, adminEntities, integrations, getUser } = createSupabaseContext(req);
    const body = await req.json().catch(() => ({}));
    const { content_type, content_id } = body;

    if (!content_type || !content_id) {
      return Response.json({ error: 'content_type and content_id required' }, { status: 400 });
    }

    let data = {};

    if (content_type === 'petition') {
      const items = await adminEntities.Petition.filter({ id: content_id });
      const p = items[0];
      if (!p) return Response.json({ error: 'Petition not found' }, { status: 404 });
      data = {
        content_type: 'petition', content_id: p.id,
        title: p.title, description: p.short_summary,
        category: p.category, country_code: p.country_code, region_code: p.region_code || null,
        creator_user_id: p.creator_user_id, creator_name: p.creator_name || null,
        tags: p.tags || [], keywords: [p.category, p.target_name, p.country_code].filter(Boolean),
        credibility_score: 50, reputation_score: 50,
        activity_score: Math.min(100, (p.signature_count_total || 0) / 10),
        relevance_score: Math.min(100, 50 + (p.signature_count_total || 0) / 20),
        is_trending: (p.signature_count_total || 0) > 100,
        is_verified: false, is_spam: false, is_flagged: p.moderation_status === 'flagged',
        status: p.status, signature_count: p.signature_count_total || 0, vote_count: 0,
        indexed_at: new Date().toISOString(),
      };
    }

    if (content_type === 'poll') {
      const items = await adminEntities.Poll.filter({ id: content_id });
      const p = items[0];
      if (!p) return Response.json({ error: 'Poll not found' }, { status: 404 });
      data = {
        content_type: 'poll', content_id: p.id,
        title: p.question, description: p.description || '',
        category: p.category, country_code: p.location_country_code || null,
        creator_user_id: p.creator_user_id, tags: p.tags || [],
        keywords: [p.category].filter(Boolean),
        credibility_score: 50, reputation_score: 50,
        activity_score: Math.min(100, (p.total_votes_cached || 0) / 10),
        relevance_score: Math.min(100, 50 + (p.total_votes_cached || 0) / 20),
        is_trending: (p.total_votes_cached || 0) > 50,
        is_verified: false, is_spam: false, is_flagged: false,
        status: p.status, signature_count: 0, vote_count: p.total_votes_cached || 0,
        indexed_at: new Date().toISOString(),
      };
    }

    if (content_type === 'community') {
      const items = await adminEntities.Community.filter({ id: content_id });
      const c = items[0];
      if (!c) return Response.json({ error: 'Community not found' }, { status: 404 });
      const memberCount = Array.isArray(c.member_ids) ? c.member_ids.length : 0;
      data = {
        content_type: 'community', content_id: c.id,
        title: c.name, description: c.description,
        category: c.community_type, country_code: c.country_code || null,
        creator_user_id: c.owner_user_id, tags: c.tags || [],
        keywords: [c.community_type, c.country_code].filter(Boolean),
        credibility_score: c.is_verified ? 80 : 50, reputation_score: 50,
        activity_score: Math.min(100, memberCount / 5),
        relevance_score: Math.min(100, 50 + memberCount / 10),
        is_trending: memberCount > 50,
        is_verified: c.is_verified || false, is_spam: false, is_flagged: false,
        status: c.status || 'active', signature_count: 0, vote_count: 0,
        indexed_at: new Date().toISOString(),
      };
    }

    if (Object.keys(data).length === 0) {
      return Response.json({ error: `Unknown content_type: ${content_type}` }, { status: 400 });
    }

    const existing = await adminEntities.SearchIndex.filter({ content_type, content_id });
    if (existing[0]) {
      await adminEntities.SearchIndex.update(existing[0].id, data);
    } else {
      await adminEntities.SearchIndex.create(data);
    }

    console.log(`[IndexContent] Indexed ${content_type} ${content_id}`);
    return Response.json({ success: true, content_type, content_id });

  } catch (error) {
    console.error('[IndexContent] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});