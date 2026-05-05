import { createSupabaseContext } from '../lib/supabaseContext.ts';

Deno.serve(async (req) => {
  try {
    const { supabase, supabaseAdmin, entities, adminEntities, integrations, getUser } = createSupabaseContext(req);
    const body = await req.json().catch(() => ({}));
    const { target_id, target_type } = body;

    // Fetch data
    const [petitions, polls, scorecards] = await Promise.all([
      adminEntities.Petition.filter({ status: 'active' }, '-signature_count_total', 30),
      adminEntities.Poll.filter({ status: 'open' }, '-total_votes_cached', 30),
      adminEntities.Scorecard.filter({ status: 'approved' }, '-total_ratings', 20),
    ]);

    // Build context for the AI
    let focusText = '';
    let focusItem = null;
    if (target_id && target_type === 'petition') {
      focusItem = petitions.find(p => p.id === target_id) || await adminEntities.Petition.get(target_id);
      focusText = `Focus item: Petition "${focusItem?.title}" with ${focusItem?.signature_count_total || 0} signatures, ${focusItem?.signature_count_verified || 0} verified, ${focusItem?.countries_represented || 0} countries, created ${focusItem?.created_date}`;
    } else if (target_id && target_type === 'poll') {
      focusItem = polls.find(p => p.id === target_id) || await adminEntities.Poll.get(target_id);
      focusText = `Focus item: Poll "${focusItem?.question}" with ${focusItem?.total_votes_cached || 0} votes, ${focusItem?.verified_votes_count || 0} verified, ${focusItem?.countries_represented || 0} countries, created ${focusItem?.created_date}`;
    } else if (target_id && target_type === 'scorecard') {
      focusItem = scorecards.find(s => s.id === target_id) || await adminEntities.Scorecard.get(target_id);
      focusText = `Focus item: Scorecard "${focusItem?.name}" with ${focusItem?.total_ratings || 0} ratings, ${focusItem?.raw_approval_score || 0}% approval, ${focusItem?.countries_represented || 0} countries, category ${focusItem?.category}`;
    }

    const platformContext = `
Platform has ${petitions.length} active petitions (total ${petitions.reduce((s,p)=>s+(p.signature_count_total||0),0)} sigs),
${polls.length} open polls (total ${polls.reduce((s,p)=>s+(p.total_votes_cached||0),0)} votes),
${scorecards.length} scorecards.
Top petition: ${petitions[0]?.title || 'none'} (${petitions[0]?.signature_count_total || 0} sigs)
${focusText}`;

    const result = await integrations.Core.InvokeLLM({
      prompt: `You are a civic engagement prediction AI. Analyze the following platform data and generate forecasts.

${platformContext}

Return JSON predictions. Be realistic and data-driven. If insufficient data, say so in confidence fields.

{
  "platform_forecast": {
    "overall_growth": "slow|stable|rapid|viral",
    "30day_outlook": string,
    "key_risks": [string],
    "key_opportunities": [string]
  },
  "petition_forecasts": [
    {
      "id": string (use the petition title as identifier),
      "title": string,
      "growth_rate": "slow|stable|rapid|viral",
      "trend_direction": "increasing|decreasing|stable|volatile",
      "virality_probability": "low|moderate|high|very_likely",
      "predicted_24h": number,
      "predicted_7d": number,
      "predicted_final": number,
      "confidence": "low|medium|high",
      "confidence_reason": string
    }
  ],
  "poll_forecasts": [
    {
      "title": string,
      "growth_rate": "slow|stable|rapid|viral",
      "trend_direction": "increasing|decreasing|stable|volatile",
      "virality_probability": "low|moderate|high|very_likely",
      "predicted_24h_votes": number,
      "confidence": "low|medium|high"
    }
  ],
  "scorecard_forecasts": [
    {
      "name": string,
      "approval_trend": "rising|falling|stable|uncertain",
      "predicted_approval_shift": number,
      "confidence": "low|medium|high"
    }
  ],
  "topic_forecasts": [
    {
      "topic": string,
      "stage": "emerging|rising|peak|declining",
      "urgency": "low|medium|high",
      "description": string
    }
  ],
  "viral_alerts": [
    {
      "title": string,
      "type": "petition|poll|scorecard",
      "reason": string,
      "probability": "moderate|high|very_likely"
    }
  ],
  "manipulation_warnings": [
    {
      "description": string,
      "severity": "low|medium|high"
    }
  ]
}`,
      response_json_schema: {
        type: 'object',
        properties: {
          platform_forecast: { type: 'object' },
          petition_forecasts: { type: 'array', items: { type: 'object' } },
          poll_forecasts: { type: 'array', items: { type: 'object' } },
          scorecard_forecasts: { type: 'array', items: { type: 'object' } },
          topic_forecasts: { type: 'array', items: { type: 'object' } },
          viral_alerts: { type: 'array', items: { type: 'object' } },
          manipulation_warnings: { type: 'array', items: { type: 'object' } },
        },
      },
    });

    return Response.json({
      success: true,
      forecasts: result,
      generated_at: new Date().toISOString(),
      data_points: { petitions: petitions.length, polls: polls.length, scorecards: scorecards.length },
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});