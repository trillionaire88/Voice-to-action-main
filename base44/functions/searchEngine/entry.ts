import { createSupabaseContext } from '../lib/supabaseContext.ts';

Deno.serve(async (req) => {
  try {
    const { supabase, supabaseAdmin, entities, adminEntities, integrations, getUser } = createSupabaseContext(req);
    const user = await getUser().catch(() => null);
    const body = await req.json().catch(() => ({}));
    const { action } = body;

    // ── Full-text search across index ────────────────────────────────────
    if (action === 'search') {
      const { query = '', types = [], category = '', country_code = '', sort = 'relevance', limit = 20 } = body;
      const q = query.toLowerCase().trim();

      // Cap at 1000 indexed items — beyond this, results degrade gracefully rather than crashing
      let allResults = await adminEntities.SearchIndex.list('-relevance_score', 1000);
      // Safety: always slice result set before returning to client

      // Filter out spam/flagged
      allResults = allResults.filter(r => !r.is_spam && !r.is_flagged);

      // Type filter
      if (types.length > 0) allResults = allResults.filter(r => types.includes(r.content_type));

      // Category filter
      if (category) allResults = allResults.filter(r => r.category === category);

      // Location filter
      if (country_code) allResults = allResults.filter(r => !r.country_code || r.country_code === country_code);

      // Text matching
      if (q) {
        allResults = allResults.filter(r => {
          const haystack = [r.title, r.description, r.category, r.creator_name, ...(r.tags || []), ...(r.keywords || [])].join(' ').toLowerCase();
          return haystack.includes(q);
        }).map(r => {
          // Score based on where match is found
          let score = r.relevance_score || 50;
          if ((r.title || '').toLowerCase().includes(q)) score += 30;
          if ((r.tags || []).some(t => t.toLowerCase().includes(q))) score += 20;
          if (r.is_trending) score += 15;
          if (r.is_verified) score += 10;
          score += (r.credibility_score || 50) * 0.1;
          score += (r.reputation_score || 50) * 0.05;
          return { ...r, _score: score };
        });
      } else {
        allResults = allResults.map(r => ({ ...r, _score: r.relevance_score || 50 }));
      }

      // Sort
      if (sort === 'relevance' || sort === 'popularity') allResults.sort((a, b) => (b._score || 0) - (a._score || 0));
      else if (sort === 'date') allResults.sort((a, b) => (b.indexed_at || '').localeCompare(a.indexed_at || ''));
      else if (sort === 'credibility') allResults.sort((a, b) => (b.credibility_score || 0) - (a.credibility_score || 0));

      // Store search query in user history
      if (user && q) {
        const interests = await adminEntities.UserInterest.filter({ user_id: user.id });
        if (interests[0]) {
          const history = [q, ...(interests[0].search_history || [])].slice(0, 20);
          await adminEntities.UserInterest.update(interests[0].id, { search_history: history });
        }
      }

      const safeLimit = Math.min(limit, 50);
      const offset = body.offset || 0;
      const page = allResults.slice(offset, offset + safeLimit);
      return Response.json({
        results: page,
        total: allResults.length,
        limit: safeLimit,
        offset,
        has_more: (offset + safeLimit) < allResults.length,
      });
    }

    // ── Autocomplete suggestions ─────────────────────────────────────────
    if (action === 'autocomplete') {
      const { query = '' } = body;
      const q = query.toLowerCase().trim();
      if (q.length < 2) return Response.json({ suggestions: [] });

      const allResults = await adminEntities.SearchIndex.list('-relevance_score', 300);
      const seen = new Set();
      const suggestions = [];

      for (const r of allResults) {
        if (r.is_spam || r.is_flagged) continue;
        if ((r.title || '').toLowerCase().startsWith(q) && !seen.has(r.title)) {
          suggestions.push({ text: r.title, type: r.content_type });
          seen.add(r.title);
          if (suggestions.length >= 8) break;
        }
      }

      // Also pull from tag matches
      if (suggestions.length < 5) {
        for (const r of allResults) {
          for (const tag of (r.tags || [])) {
            if (tag.toLowerCase().startsWith(q) && !seen.has(tag)) {
              suggestions.push({ text: tag, type: 'tag' });
              seen.add(tag);
              if (suggestions.length >= 8) break;
            }
          }
          if (suggestions.length >= 8) break;
        }
      }

      return Response.json({ suggestions });
    }

    // ── Index a piece of content ─────────────────────────────────────────
    if (action === 'index_content') {
      if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
      const { content_type, content_id, title, description, tags, keywords, category, country_code, region_code,
              creator_user_id, creator_name, credibility_score, reputation_score, activity_score,
              is_trending, is_verified, status, signature_count, vote_count } = body;

      // Check if already indexed
      const existing = await adminEntities.SearchIndex.filter({ content_type, content_id });
      const relevance_score = Math.min(100, (credibility_score || 50) * 0.3 + (reputation_score || 50) * 0.2 + (activity_score || 0) * 0.3 + (is_trending ? 20 : 0));

      const data = {
        content_type, content_id, title, description,
        tags: tags || [], keywords: keywords || [],
        category, country_code, region_code,
        creator_user_id, creator_name,
        credibility_score: credibility_score || 50,
        reputation_score: reputation_score || 50,
        activity_score: activity_score || 0,
        relevance_score,
        is_trending: is_trending || false,
        is_verified: is_verified || false,
        status, signature_count: signature_count || 0,
        vote_count: vote_count || 0,
        indexed_at: new Date().toISOString(),
      };

      if (existing[0]) {
        await adminEntities.SearchIndex.update(existing[0].id, data);
      } else {
        await adminEntities.SearchIndex.create(data);
      }
      return Response.json({ success: true });
    }

    // ── Bulk index existing content ──────────────────────────────────────
    if (action === 'bulk_index') {
      if (!user || user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

      let indexed = 0;

      // Index petitions
      const petitions = await adminEntities.Petition.filter({ status: 'active', moderation_status: 'approved' }, '-created_date', 100);
      for (const p of petitions) {
        const existing = await adminEntities.SearchIndex.filter({ content_type: 'petition', content_id: p.id });
        const data = {
          content_type: 'petition', content_id: p.id,
          title: p.title, description: p.short_summary,
          category: p.category, country_code: p.country_code, region_code: p.region_code,
          creator_user_id: p.creator_user_id,
          tags: [], keywords: [p.category, p.target_name].filter(Boolean),
          credibility_score: 50, reputation_score: 50,
          activity_score: Math.min(100, (p.signature_count_total || 0) / 100),
          is_trending: false, is_verified: false,
          status: p.status, signature_count: p.signature_count_total || 0,
          indexed_at: new Date().toISOString(),
          relevance_score: 50,
        };
        if (existing[0]) { await adminEntities.SearchIndex.update(existing[0].id, data); }
        else { await adminEntities.SearchIndex.create(data); }
        indexed++;
      }

      // Index communities
      const communities = await adminEntities.Community.filter({ status: 'active' }, '-created_date', 50);
      for (const c of communities) {
        const existing = await adminEntities.SearchIndex.filter({ content_type: 'community', content_id: c.id });
        const data = {
          content_type: 'community', content_id: c.id,
          title: c.name, description: c.description_public,
          category: c.community_type, country_code: c.country_code,
          tags: c.tags || [], keywords: [c.community_type].filter(Boolean),
          credibility_score: 50, reputation_score: 50,
          activity_score: Math.min(100, (c.member_count || 0) / 10),
          status: c.status, indexed_at: new Date().toISOString(),
          relevance_score: 50,
        };
        if (existing[0]) { await adminEntities.SearchIndex.update(existing[0].id, data); }
        else { await adminEntities.SearchIndex.create(data); }
        indexed++;
      }

      return Response.json({ success: true, indexed });
    }

    // ── Trending searches ────────────────────────────────────────────────
    if (action === 'trending') {
      const trending = await adminEntities.SearchIndex.filter({ is_trending: true }, '-relevance_score', 10);
      return Response.json({ trending });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});