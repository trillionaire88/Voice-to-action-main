import { createSupabaseContext } from '../lib/supabaseContext.ts';

// Public endpoint - no auth required, returns cached-style trend data
Deno.serve(async (req) => {
  try {
    const { supabase, supabaseAdmin, entities, adminEntities, integrations, getUser } = createSupabaseContext(req);

    const [petitions, polls, scorecards] = await Promise.all([
      adminEntities.Petition.filter({ status: 'active' }, '-signature_count_total', 20),
      adminEntities.Poll.filter({ status: 'open' }, '-total_votes_cached', 20),
      adminEntities.Scorecard.filter({ status: 'approved' }, '-total_ratings', 15),
    ]);

    const corpus = [
      ...petitions.map(p => ({ text: `${p.title} ${p.short_summary || ''} ${p.category}`, type: 'petition', id: p.id, title: p.title, sigs: p.signature_count_total || 0 })),
      ...polls.map(p => ({ text: `${p.question} ${p.description || ''} ${p.category}`, type: 'poll', id: p.id, title: p.question, votes: p.total_votes_cached || 0 })),
    ];

    if (corpus.length === 0) {
      return Response.json({ success: true, trends: [], topics: [], generated_at: new Date().toISOString() });
    }

    const result = await integrations.Core.InvokeLLM({
      prompt: `Analyze this civic platform activity and identify public trends. Be concise.

Content (${corpus.length} items):
${corpus.map(c => `[${c.type}] ${c.text}`).slice(0, 30).join('\n').slice(0, 3000)}

Return JSON:
{
  "top_topics": [
    {"name": string, "label": string, "count": number, "trend": "rising|stable|falling", "color": "one of: blue|green|red|amber|purple|pink|indigo|teal"}
  ],
  "trending_now": [
    {"title": string, "type": "petition|poll|scorecard", "momentum": "hot|rising|stable", "reason": string}
  ],
  "sentiment_distribution": {
    "positive": number,
    "neutral": number,
    "negative": number,
    "controversial": number
  },
  "hot_debates": [
    {"topic": string, "description": string, "intensity": "medium|high|extreme"}
  ],
  "public_mood": string,
  "key_insight": string
}`,
      response_json_schema: {
        type: 'object',
        properties: {
          top_topics: { type: 'array', items: { type: 'object' } },
          trending_now: { type: 'array', items: { type: 'object' } },
          sentiment_distribution: { type: 'object' },
          hot_debates: { type: 'array', items: { type: 'object' } },
          public_mood: { type: 'string' },
          key_insight: { type: 'string' },
        },
      },
    });

    return Response.json({
      success: true,
      ...result,
      stats: {
        petitions: petitions.length,
        polls: polls.length,
        scorecards: scorecards.length,
        total_sigs: petitions.reduce((s, p) => s + (p.signature_count_total || 0), 0),
        total_votes: polls.reduce((s, p) => s + (p.total_votes_cached || 0), 0),
      },
      generated_at: new Date().toISOString(),
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});