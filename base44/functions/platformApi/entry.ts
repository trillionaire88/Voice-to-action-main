import { createSupabaseContext } from '../lib/supabaseContext.ts';

// Simple in-memory rate limit tracker (resets on function cold start)
const rateLimitMap = new Map();

function checkRateLimit(keyId, limitPerMinute = 60) {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const entry = rateLimitMap.get(keyId) || { count: 0, windowStart: now };
  if (now - entry.windowStart > windowMs) {
    entry.count = 0;
    entry.windowStart = now;
  }
  entry.count++;
  rateLimitMap.set(keyId, entry);
  return entry.count <= limitPerMinute;
}

function sanitizePetition(p) {
  return {
    id: p.id,
    title: p.title,
    short_summary: p.short_summary,
    category: p.category,
    country_code: p.country_code,
    target_name: p.target_name,
    status: p.status,
    signature_count_total: p.signature_count_total,
    signature_count_verified: p.signature_count_verified,
    signature_goal: p.signature_goal,
    created_date: p.created_date,
    is_trending: p.is_trending,
  };
}

function sanitizePoll(p) {
  return {
    id: p.id,
    question: p.question,
    category: p.category,
    status: p.status,
    total_votes_cached: p.total_votes_cached,
    verified_votes_count: p.verified_votes_count,
    countries_represented: p.countries_represented,
    created_date: p.created_date,
    closes_at: p.closes_at,
  };
}

function sanitizeScorecard(s) {
  return {
    id: s.id,
    name: s.name,
    category: s.category,
    country_code: s.country_code,
    total_ratings: s.total_ratings,
    raw_approval_score: s.raw_approval_score,
    credibility_score: s.credibility_score,
    credibility_label: s.credibility_label,
    is_trending: s.is_trending,
  };
}

Deno.serve(async (req) => {
  const { supabase, supabaseAdmin, entities, adminEntities, integrations, getUser } = createSupabaseContext(req);
  const body = await req.json().catch(() => ({}));
  const { endpoint, api_key, params = {} } = body;

  if (!api_key) {
    return Response.json({ error: 'API key required' }, { status: 401 });
  }
  if (!endpoint) {
    return Response.json({ error: 'endpoint required' }, { status: 400 });
  }

  try {
    // Validate API key
    const keys = await adminEntities.ApiKey.filter({ api_key, status: 'active' });
    if (!keys || keys.length === 0) {
      return Response.json({ error: 'Invalid or revoked API key' }, { status: 403 });
    }
    const keyRecord = keys[0];

    // Rate limit check
    if (!checkRateLimit(keyRecord.id, keyRecord.rate_limit_per_minute || 60)) {
      return Response.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    // Update usage (fire and forget)
    adminEntities.ApiKey.update(keyRecord.id, {
      total_requests: (keyRecord.total_requests || 0) + 1,
      last_used_at: new Date().toISOString(),
    }).catch(() => {});

    const perms = keyRecord.permissions || [];

    // Route to endpoint
    if (endpoint === 'petitions') {
      if (!perms.includes('read_petitions')) return Response.json({ error: 'Permission denied' }, { status: 403 });
      const limit = Math.min(params.limit || 20, 50);
      const data = await adminEntities.Petition.filter({ status: 'active' }, '-signature_count_total', limit);
      return Response.json({ success: true, data: data.map(sanitizePetition), count: data.length, v: 'v1' });
    }

    if (endpoint === 'polls') {
      if (!perms.includes('read_votes')) return Response.json({ error: 'Permission denied' }, { status: 403 });
      const limit = Math.min(params.limit || 20, 50);
      const data = await adminEntities.Poll.filter({ status: 'open' }, '-total_votes_cached', limit);
      return Response.json({ success: true, data: data.map(sanitizePoll), count: data.length, v: 'v1' });
    }

    if (endpoint === 'scorecards') {
      if (!perms.includes('read_scorecards')) return Response.json({ error: 'Permission denied' }, { status: 403 });
      const limit = Math.min(params.limit || 20, 50);
      const data = await adminEntities.Scorecard.filter({ status: 'approved' }, '-total_ratings', limit);
      return Response.json({ success: true, data: data.map(sanitizeScorecard), count: data.length, v: 'v1' });
    }

    if (endpoint === 'statistics') {
      if (!perms.includes('read_statistics')) return Response.json({ error: 'Permission denied' }, { status: 403 });
      const [petitions, polls, scorecards, communities] = await Promise.all([
        adminEntities.Petition.filter({ status: 'active' }),
        adminEntities.Poll.filter({ status: 'open' }),
        adminEntities.Scorecard.filter({ status: 'approved' }),
        adminEntities.Community.filter({ status: 'active' }),
      ]);
      return Response.json({
        success: true,
        data: {
          active_petitions: petitions.length,
          total_signatures: petitions.reduce((s, p) => s + (p.signature_count_total || 0), 0),
          active_polls: polls.length,
          total_votes: polls.reduce((s, p) => s + (p.total_votes_cached || 0), 0),
          active_scorecards: scorecards.length,
          active_communities: communities.length,
        },
        v: 'v1',
      });
    }

    if (endpoint === 'trending') {
      if (!perms.includes('read_trending')) return Response.json({ error: 'Permission denied' }, { status: 403 });
      const petitions = await adminEntities.Petition.filter({ status: 'active', is_trending: true }, '-signature_count_total', 10);
      const scorecards = await adminEntities.Scorecard.filter({ status: 'approved', is_trending: true }, '-total_ratings', 10);
      return Response.json({ success: true, data: { trending_petitions: petitions.map(sanitizePetition), trending_scorecards: scorecards.map(sanitizeScorecard) }, v: 'v1' });
    }

    return Response.json({ error: `Unknown endpoint: ${endpoint}. Available: petitions, polls, scorecards, statistics, trending` }, { status: 404 });

  } catch (error) {
    console.error('[PlatformAPI] Error:', error.message);
    return Response.json({ error: 'An internal error occurred' }, { status: 500 });
  }
});