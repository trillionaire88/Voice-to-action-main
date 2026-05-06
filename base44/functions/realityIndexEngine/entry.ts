import { createSupabaseContext } from '../lib/supabaseContext.ts';

Deno.serve(async (req) => {
  try {
    const { supabase, supabaseAdmin, entities, adminEntities, integrations, getUser } = createSupabaseContext(req);
    const body = await req.json().catch(() => ({}));
    const { action = 'analyze', issue_title } = body;

    const [petitions, polls, scorecards, narratives] = await Promise.all([
      adminEntities.Petition.filter({ status: 'active' }, '-signature_count_total', 20),
      adminEntities.Poll.list('-total_votes_cached', 20),
      adminEntities.Scorecard.filter({ status: 'approved' }, '-total_ratings', 15),
      adminEntities.Narrative.list('-created_date', 50),
    ]);

    // Group narratives by issue
    const issueMap = {};
    narratives.forEach(n => {
      const key = n.issue_title?.toLowerCase().trim();
      if (!key) return;
      if (!issueMap[key]) issueMap[key] = { title: n.issue_title, narratives: [] };
      issueMap[key].narratives.push(n);
    });

    // Build platform data summary
    const platformSummary = `
Petitions (${petitions.length}): ${petitions.slice(0, 8).map(p => `"${p.title}" ${p.signature_count_total || 0} sigs, ${p.country_code}`).join('; ')}
Polls (${polls.length}): ${polls.slice(0, 8).map(p => `"${p.question}" ${p.total_votes_cached || 0} votes`).join('; ')}
Scorecards (${scorecards.length}): ${scorecards.slice(0, 5).map(s => `"${s.name}" ${s.raw_approval_score || 0}% approval`).join('; ')}
Narratives stored: ${narratives.length}`;

    const narrativeSummary = narratives.length > 0
      ? `Existing narratives: ${narratives.slice(0, 10).map(n => `[${n.narrative_type}] "${n.issue_title}": ${n.statement_summary?.slice(0, 80)}`).join('; ')}`
      : 'No narratives stored yet — analysis will be based on platform data only.';

    const focusText = issue_title ? `Focus on issue: "${issue_title}"` : 'Analyze all issues';

    const result = await integrations.Core.InvokeLLM({
      prompt: `You are a Reality Index AI for a civic platform. Your job is to compare different narratives about issues with actual platform opinion data.

IMPORTANT: Never claim absolute truth. Present results as statistical comparison only.

Platform Data:
${platformSummary}

${narrativeSummary}

${focusText}

Analyze and return a Reality Index comparison. For each issue, compare what different sources say vs what platform users actually support.

Return JSON:
{
  "issues": [
    {
      "title": string,
      "category": string,
      "platform_support_pct": number,
      "platform_oppose_pct": number,
      "platform_neutral_pct": number,
      "consensus_score": number (0-100),
      "division_index": "low|moderate|high|extreme",
      "narratives": [
        {
          "source": string,
          "type": "media|government|community|platform|regional|expert",
          "stance": "supportive|opposing|neutral|mixed",
          "summary": string,
          "agreement_with_platform": "agreement|partial_agreement|disagreement|strong_disagreement",
          "reality_index_score": number (0-100, 100=matches platform opinion perfectly)
        }
      ],
      "largest_disagreement": string (which narrative disagrees most and why),
      "highest_agreement": string (which narrative agrees most),
      "confidence": "low|medium|high"
    }
  ],
  "top_disagreements": [
    {
      "issue": string,
      "source": string,
      "description": string,
      "severity": "minor|moderate|major"
    }
  ],
  "top_agreements": [
    {
      "issue": string,
      "source": string,
      "description": string
    }
  ],
  "most_controversial": [string],
  "platform_summary": string (what most users think across all issues),
  "key_divisions": [string],
  "confidence_overall": "low|medium|high",
  "data_note": string (important caveat about data limitations)
}`,
      response_json_schema: {
        type: 'object',
        properties: {
          issues: { type: 'array', items: { type: 'object' } },
          top_disagreements: { type: 'array', items: { type: 'object' } },
          top_agreements: { type: 'array', items: { type: 'object' } },
          most_controversial: { type: 'array', items: { type: 'string' } },
          platform_summary: { type: 'string' },
          key_divisions: { type: 'array', items: { type: 'string' } },
          confidence_overall: { type: 'string' },
          data_note: { type: 'string' },
        },
      },
    });

    return Response.json({
      success: true,
      reality_index: result,
      stats: { petitions: petitions.length, polls: polls.length, scorecards: scorecards.length, narratives: narratives.length },
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});