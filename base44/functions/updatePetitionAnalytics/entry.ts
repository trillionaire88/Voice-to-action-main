import { createSupabaseContext } from '../lib/supabaseContext.ts';

const OWNER_EMAIL = 'voicetoaction@outlook.com';

Deno.serve(async (req) => {
  try {
    const { supabase, supabaseAdmin, entities, adminEntities, integrations, getUser } = createSupabaseContext(req);

    // Allow scheduled (no user) or owner_admin
    try {
      const user = await getUser();
      const isOwner = user?.role === 'owner_admin' || (user?.role === 'admin' && user?.email === OWNER_EMAIL);
      if (!isOwner) return Response.json({ error: 'Forbidden' }, { status: 403 });
    } catch { /* scheduled automation */ }

    const body = await req.json().catch(() => ({}));
    const specificPetitionId = body.petition_id || null;

    const now = new Date();
    const today = new Date(now); today.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(now - 7 * 86400000);
    const thirtyDaysAgo = new Date(now - 30 * 86400000);

    // Fetch petitions to process
    let petitions;
    if (specificPetitionId) {
      petitions = await adminEntities.Petition.filter({ id: specificPetitionId });
    } else {
      petitions = await adminEntities.Petition.filter({ status: 'active' });
    }

    console.log(`[Analytics] Processing ${petitions.length} petition(s)`);

    let updated = 0;
    let errors = 0;

    for (const petition of petitions) {
      try {
        // Fetch all non-invalidated, non-withdrawn signatures for this petition
        const allSigs = await adminEntities.PetitionSignature.filter({
          petition_id: petition.id,
          is_invalidated: false,
          has_withdrawn: false,
        });

        const signaturesTotal = allSigs.length;
        const signaturesVerified = allSigs.filter(s => s.is_verified_user).length;
        const signaturesEmailConfirmed = allSigs.filter(s => s.is_email_confirmed).length;

        // Time-based counts
        const signaturestoday = allSigs.filter(s => new Date(s.created_date) >= today).length;
        const signatures7d = allSigs.filter(s => new Date(s.created_date) >= sevenDaysAgo).length;
        const signatures30d = allSigs.filter(s => new Date(s.created_date) >= thirtyDaysAgo).length;

        // Source breakdown
        const directSigs = allSigs.filter(s => !s.source || s.source === 'direct').length;
        const referralSigs = allSigs.filter(s => s.source === 'referral' || s.source === 'share').length;
        const communitySigs = allSigs.filter(s => s.source === 'community').length;

        // Geographic diversity
        const uniqueCountries = new Set(allSigs.filter(s => s.country_code).map(s => s.country_code)).size;

        // Verified score (0-100): weighted formula
        const emailConfirmedRate = signaturesTotal > 0 ? signaturesEmailConfirmed / signaturesTotal : 0;
        const verifiedRate = signaturesTotal > 0 ? signaturesVerified / signaturesTotal : 0;
        const geoBonus = Math.min(uniqueCountries / 20, 1); // up to 20 bonus pts for geo diversity
        const verifiedScore = Math.round(
          (verifiedRate * 50) + (emailConfirmedRate * 30) + (geoBonus * 20)
        );

        // Growth rate: ((7d sigs - prior 7d sigs) / prior 7d) * 100
        const priorPeriodStart = new Date(now - 14 * 86400000);
        const priorPeriodSigs = allSigs.filter(s => {
          const d = new Date(s.created_date);
          return d >= priorPeriodStart && d < sevenDaysAgo;
        }).length;
        const growthRate7d = priorPeriodSigs > 0
          ? ((signatures7d - priorPeriodSigs) / priorPeriodSigs) * 100
          : signatures7d > 0 ? 100 : 0;

        // Peak day (simple: check last 30 days by day)
        const dayMap = {};
        allSigs.filter(s => new Date(s.created_date) >= thirtyDaysAgo).forEach(s => {
          const day = new Date(s.created_date).toDateString();
          dayMap[day] = (dayMap[day] || 0) + 1;
        });
        const peakDay = Math.max(0, ...Object.values(dayMap));

        // Upsert analytics record
        const existing = await adminEntities.PetitionAnalytics.filter({ petition_id: petition.id });

        const analyticsData = {
          petition_id: petition.id,
          total_signatures: signaturesTotal,
          signatures_today: signaturestoday,
          signatures_7_days: signatures7d,
          signatures_30_days: signatures30d,
          verified_signatures: signaturesVerified,
          verified_score: verifiedScore,
          direct_signatures: directSigs,
          referral_signatures: referralSigs,
          community_signatures: communitySigs,
          growth_rate_7d: Math.round(growthRate7d * 10) / 10,
          peak_day_count: peakDay,
          countries_count: uniqueCountries,
          last_updated: now.toISOString(),
        };

        if (existing.length > 0) {
          await adminEntities.PetitionAnalytics.update(existing[0].id, analyticsData);
        } else {
          await adminEntities.PetitionAnalytics.create(analyticsData);
        }

        updated++;
      } catch (e) {
        console.error(`[Analytics] Error processing petition ${petition.id}:`, e.message);
        errors++;
      }
    }

    // Alert if errors on full run
    if (errors > 0 && !specificPetitionId) {
      await integrations.Core.SendEmail({
        to: OWNER_EMAIL,
        subject: `⚠️ Petition Analytics: ${errors} error(s) during daily update`,
        body: `Daily petition analytics update encountered ${errors} error(s) and updated ${updated} petition(s).\n\nTime: ${now.toISOString()}\n\nPlease check backend logs for details.`,
      }).catch(() => {});
    }

    console.log(`[Analytics] Done. Updated: ${updated}, Errors: ${errors}`);
    return Response.json({ success: true, updated, errors, timestamp: now.toISOString() });

  } catch (error) {
    console.error('[Analytics] Fatal error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});