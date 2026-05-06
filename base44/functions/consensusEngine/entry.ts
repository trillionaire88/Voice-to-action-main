import { createSupabaseContext } from '../lib/supabaseContext.ts';

Deno.serve(async (req) => {
  try {
    const { supabase, supabaseAdmin, entities, adminEntities, integrations, getUser } = createSupabaseContext(req);

    const [petitions, polls, scorecards, communities] = await Promise.all([
      adminEntities.Petition.filter({ status: 'active' }, '-signature_count_total', 30),
      adminEntities.Poll.list('-total_votes_cached', 30),
      adminEntities.Scorecard.filter({ status: 'approved' }, '-total_ratings', 20),
      adminEntities.Community.filter({ status: 'active' }, '-member_count', 10),
    ]);

    // Compute consensus metrics from real data
    const totalPetitionSigs = petitions.reduce((s, p) => s + (p.signature_count_total || 0), 0);
    const totalVerifiedSigs = petitions.reduce((s, p) => s + (p.signature_count_verified || 0), 0);
    const totalVotes = polls.reduce((s, p) => s + (p.total_votes_cached || 0), 0);
    const totalVerifiedVotes = polls.reduce((s, p) => s + (p.verified_votes_count || 0), 0);

    // Scorecard consensus: how split is the approval?
    const scorecardConsensus = scorecards.map(s => ({
      name: s.name,
      approval: s.raw_approval_score || 50,
      total: s.total_ratings || 0,
      // consensus = how close to 0 or 100 (clear majority)
      consensus_score: Math.round(Math.abs((s.raw_approval_score || 50) - 50) * 2),
      division_index: Math.round(100 - Math.abs((s.raw_approval_score || 50) - 50) * 2),
    }));

    // Country diversity
    const countryCodes = [...new Set([
      ...petitions.map(p => p.country_code).filter(Boolean),
      ...polls.map(p => p.location_country_code).filter(Boolean),
    ])];

    const platformData = `
Active petitions: ${petitions.length}, total signatures: ${totalPetitionSigs}, verified: ${totalVerifiedSigs}
Active polls: ${polls.length}, total votes: ${totalVotes}, verified: ${totalVerifiedVotes}
Scorecards: ${scorecards.length}
Countries represented: ${countryCodes.length}
Communities: ${communities.length}

Top petitions by support: ${petitions.slice(0, 5).map(p => `"${p.title}" (${p.signature_count_total || 0} sigs, ${p.country_code})`).join(', ')}
Top polls: ${polls.slice(0, 5).map(p => `"${p.question}" (${p.total_votes_cached || 0} votes)`).join(', ')}
Scorecard approvals: ${scorecards.slice(0, 5).map(s => `"${s.name}" ${s.raw_approval_score || 0}%`).join(', ')}`;

    const result = await integrations.Core.InvokeLLM({
      prompt: `You are a global consensus analysis AI for a civic platform. Analyze the data and measure collective opinion.

${platformData}

Return comprehensive consensus analysis as JSON:
{
  "global_consensus_score": number (0-100, 0=total division, 100=strong agreement),
  "platform_summary": string (2-3 sentences describing overall public opinion state),
  "majority_opinion": string,
  "main_divisions": [string],
  "consensus_label": "strong_consensus|moderate_consensus|divided_opinion|highly_controversial|no_clear_majority",
  "issues": [
    {
      "title": string,
      "type": "petition|poll|scorecard",
      "support_pct": number,
      "oppose_pct": number,
      "neutral_pct": number,
      "consensus_score": number (0-100),
      "division_index": "low|moderate|high|extreme",
      "trend_direction": "gaining_support|losing_support|stable|volatile",
      "consensus_label": string,
      "confidence": "low|medium|high"
    }
  ],
  "most_agreed": [{"title": string, "type": string, "consensus_score": number, "reason": string}],
  "most_controversial": [{"title": string, "type": string, "division_reason": string}],
  "fastest_changing": [{"title": string, "type": string, "change_description": string}],
  "regional_notes": [{"region": string, "dominant_view": string, "notes": string}],
  "ai_summary": {
    "current_majority": string,
    "where_disagreement_exists": string,
    "where_opinion_shifting": string,
    "predicted_future": string
  },
  "confidence_indicators": {
    "data_volume": "low|medium|high",
    "verification_rate": number,
    "geographic_diversity": "low|medium|high",
    "overall_confidence": "low|medium|high"
  }
}`,
      response_json_schema: {
        type: 'object',
        properties: {
          global_consensus_score: { type: 'number' },
          platform_summary: { type: 'string' },
          majority_opinion: { type: 'string' },
          main_divisions: { type: 'array', items: { type: 'string' } },
          consensus_label: { type: 'string' },
          issues: { type: 'array', items: { type: 'object' } },
          most_agreed: { type: 'array', items: { type: 'object' } },
          most_controversial: { type: 'array', items: { type: 'object' } },
          fastest_changing: { type: 'array', items: { type: 'object' } },
          regional_notes: { type: 'array', items: { type: 'object' } },
          ai_summary: { type: 'object' },
          confidence_indicators: { type: 'object' },
        },
      },
    });

    return Response.json({
      success: true,
      consensus: result,
      raw_stats: {
        total_petition_sigs: totalPetitionSigs,
        verified_sig_rate: totalPetitionSigs > 0 ? Math.round(totalVerifiedSigs / totalPetitionSigs * 100) : 0,
        total_votes: totalVotes,
        verified_vote_rate: totalVotes > 0 ? Math.round(totalVerifiedVotes / totalVotes * 100) : 0,
        countries: countryCodes.length,
        petitions: petitions.length,
        polls: polls.length,
        scorecards: scorecards.length,
      },
      generated_at: new Date().toISOString(),
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});