import { createSupabaseContext } from '../lib/supabaseContext.ts';

Deno.serve(async (req) => {
  try {
    const { supabase, supabaseAdmin, entities, adminEntities, integrations, getUser } = createSupabaseContext(req);
    const user = await getUser();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { action = 'full_analysis', target_id, target_type } = body;

    // ── Fetch platform data ──────────────────────────────────────────────
    const [petitions, polls, scorecards, reports] = await Promise.all([
      adminEntities.Petition.filter({ status: 'active' }, '-signature_count_total', 30),
      adminEntities.Poll.filter({ status: 'open' }, '-total_votes_cached', 30),
      adminEntities.Scorecard.filter({ status: 'approved' }, '-total_ratings', 20),
      adminEntities.Report.filter({ status: 'open' }, '-created_date', 20),
    ]);

    // ── Single item analysis ──────────────────────────────────────────────
    if (action === 'analyze_item' && target_id && target_type) {
      let item = null;
      if (target_type === 'petition') item = petitions.find(p => p.id === target_id) || await adminEntities.Petition.get(target_id);
      if (target_type === 'poll') item = polls.find(p => p.id === target_id) || await adminEntities.Poll.get(target_id);
      if (target_type === 'scorecard') item = scorecards.find(s => s.id === target_id) || await adminEntities.Scorecard.get(target_id);

      const text = target_type === 'petition'
        ? `${item.title}. ${item.short_summary || ''} ${item.full_description || ''}`
        : target_type === 'poll'
        ? `${item.question}. ${item.description || ''}`
        : `${item.name}. ${item.description || ''} Category: ${item.category}`;

      const result = await integrations.Core.InvokeLLM({
        prompt: `Analyze this civic platform content. Return JSON only.

Content: "${text.slice(0, 1500)}"

Return:
{
  "sentiment": "positive|negative|neutral|mixed|highly_controversial",
  "sentiment_score": -100 to 100,
  "topics": ["array of 1-5 detected topics from: politics, economy, education, health, immigration, environment, technology, social_issues, housing, justice, labor, international"],
  "summary": "2-3 sentence plain-English summary of the issue",
  "main_arguments_for": ["up to 3 bullet points"],
  "main_arguments_against": ["up to 3 bullet points"],
  "controversy_level": "low|medium|high|extreme",
  "safety_flags": ["any of: threats, illegal_activity, spam_pattern, brigading_risk or empty array"],
  "audience": "who is most affected by this issue"
}`,
        response_json_schema: {
          type: 'object',
          properties: {
            sentiment: { type: 'string' },
            sentiment_score: { type: 'number' },
            topics: { type: 'array', items: { type: 'string' } },
            summary: { type: 'string' },
            main_arguments_for: { type: 'array', items: { type: 'string' } },
            main_arguments_against: { type: 'array', items: { type: 'string' } },
            controversy_level: { type: 'string' },
            safety_flags: { type: 'array', items: { type: 'string' } },
            audience: { type: 'string' },
          },
        },
      });

      return Response.json({ success: true, analysis: result, target_type, target_id });
    }

    // ── Full platform analysis ─────────────────────────────────────────────
    // Build combined text corpus for trend detection
    const petitionTexts = petitions.map(p => `${p.title} ${p.short_summary || ''} ${p.category || ''}`).join('\n');
    const pollTexts = polls.map(p => `${p.question} ${p.description || ''} ${p.category || ''}`).join('\n');
    const scorecardTexts = scorecards.map(s => `${s.name} ${s.category || ''} approval:${s.raw_approval_score || 0}%`).join('\n');

    const platformAnalysis = await integrations.Core.InvokeLLM({
      prompt: `You are analyzing a civic engagement platform. Identify trends, hot topics, and sentiment patterns from this data.

ACTIVE PETITIONS (${petitions.length}):
${petitionTexts.slice(0, 2000)}

ACTIVE VOTES (${polls.length}):
${pollTexts.slice(0, 1500)}

SCORECARDS (${scorecards.length}):
${scorecardTexts.slice(0, 800)}

Return comprehensive platform intelligence as JSON:
{
  "top_topics": [{"topic": string, "count": number, "momentum": "rising|stable|falling", "sentiment": string}],
  "trending_issues": [{"title": string, "category": string, "reason": string}],
  "sentiment_overview": {"positive_pct": number, "negative_pct": number, "neutral_pct": number, "most_positive_topic": string, "most_negative_topic": string},
  "most_controversial": [{"title": string, "type": string, "controversy_reason": string}],
  "rising_debates": [{"topic": string, "description": string, "urgency": "low|medium|high"}],
  "platform_health": {"overall_sentiment": string, "key_concerns": [string], "positive_developments": [string]},
  "manipulation_alerts": [{"type": string, "description": string, "severity": "low|medium|high"}],
  "executive_summary": "3-4 sentence overview of current platform activity and public opinion trends"
}`,
      response_json_schema: {
        type: 'object',
        properties: {
          top_topics: { type: 'array', items: { type: 'object' } },
          trending_issues: { type: 'array', items: { type: 'object' } },
          sentiment_overview: { type: 'object' },
          most_controversial: { type: 'array', items: { type: 'object' } },
          rising_debates: { type: 'array', items: { type: 'object' } },
          platform_health: { type: 'object' },
          manipulation_alerts: { type: 'array', items: { type: 'object' } },
          executive_summary: { type: 'string' },
        },
      },
    });

    return Response.json({
      success: true,
      analysis: platformAnalysis,
      stats: {
        petitions_analyzed: petitions.length,
        polls_analyzed: polls.length,
        scorecards_analyzed: scorecards.length,
        open_reports: reports.length,
      },
      generated_at: new Date().toISOString(),
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});