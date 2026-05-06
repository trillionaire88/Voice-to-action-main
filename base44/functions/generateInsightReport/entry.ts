import { createSupabaseContext } from '../lib/supabaseContext.ts';

Deno.serve(async (req) => {
  try {
    const { supabase, supabaseAdmin, entities, adminEntities, integrations, getUser } = createSupabaseContext(req);
    const user = await getUser();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { topic_filter, report_type = 'full' } = body;

    const [petitions, polls, scorecards, communities] = await Promise.all([
      adminEntities.Petition.filter({ status: 'active' }, '-signature_count_total', 20),
      adminEntities.Poll.list('-total_votes_cached', 20),
      adminEntities.Scorecard.filter({ status: 'approved' }, '-total_ratings', 15),
      adminEntities.Community.filter({ status: 'active' }, '-member_count', 10),
    ]);

    const topPetition = petitions[0];
    const totalSigs = petitions.reduce((s, p) => s + (p.signature_count_total || 0), 0);
    const totalVotes = polls.reduce((s, p) => s + (p.total_votes_cached || 0), 0);
    const totalRatings = scorecards.reduce((s, c) => s + (c.total_ratings || 0), 0);

    const report = await integrations.Core.InvokeLLM({
      prompt: `Generate a professional public opinion intelligence report for a civic engagement platform.

Platform Data:
- ${petitions.length} active petitions, ${totalSigs.toLocaleString()} total signatures
- ${polls.length} polls, ${totalVotes.toLocaleString()} total votes  
- ${scorecards.length} scorecards, ${totalRatings.toLocaleString()} ratings
- ${communities.length} active communities

Top petitions: ${petitions.slice(0, 5).map(p => `"${p.title}" (${p.signature_count_total || 0} sigs, ${p.country_code})`).join(', ')}
Top polls: ${polls.slice(0, 5).map(p => `"${p.question}" (${p.total_votes_cached || 0} votes)`).join(', ')}
Top scorecards: ${scorecards.slice(0, 5).map(s => `"${s.name}" ${s.raw_approval_score || 0}% approval`).join(', ')}
${topic_filter ? `Focus on topic: ${topic_filter}` : ''}

Return a structured report as JSON:
{
  "report_title": string,
  "report_date": string,
  "executive_summary": string (2-3 paragraphs),
  "key_findings": [string],
  "most_discussed_topics": [{"topic": string, "activity_level": string, "description": string}],
  "most_supported_issues": [{"issue": string, "support_level": string, "notes": string}],
  "most_controversial_issues": [{"issue": string, "controversy_reason": string}],
  "fastest_growing_issues": [{"issue": string, "growth_reason": string}],
  "regional_highlights": [{"region": string, "dominant_issue": string, "notes": string}],
  "recommendations": [string],
  "data_integrity_note": string
}`,
      response_json_schema: {
        type: 'object',
        properties: {
          report_title: { type: 'string' },
          report_date: { type: 'string' },
          executive_summary: { type: 'string' },
          key_findings: { type: 'array', items: { type: 'string' } },
          most_discussed_topics: { type: 'array', items: { type: 'object' } },
          most_supported_issues: { type: 'array', items: { type: 'object' } },
          most_controversial_issues: { type: 'array', items: { type: 'object' } },
          fastest_growing_issues: { type: 'array', items: { type: 'object' } },
          regional_highlights: { type: 'array', items: { type: 'object' } },
          recommendations: { type: 'array', items: { type: 'string' } },
          data_integrity_note: { type: 'string' },
        },
      },
    });

    return Response.json({ success: true, report, generated_at: new Date().toISOString() });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});