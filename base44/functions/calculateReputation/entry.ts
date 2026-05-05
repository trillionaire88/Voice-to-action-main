import { createSupabaseContext } from '../lib/supabaseContext.ts';

/**
 * Calculates and stores the reputation score for a given user_id.
 * Can be called by any authenticated user for their own ID, or by admin for any user.
 */
Deno.serve(async (req) => {
  try {
    const { supabase, supabaseAdmin, entities, adminEntities, integrations, getUser } = createSupabaseContext(req);
    const user = await getUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { user_id } = await req.json();
    if (!user_id) return Response.json({ error: 'user_id required' }, { status: 400 });

    // Only allow self or admin
    if (user_id !== user.id && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch all required data in parallel
    const [
      targetUsers,
      petitions,
      credScores,
      comments,
      reports,
      moderationLogs,
      signatures,
    ] = await Promise.all([
      adminEntities.User.filter({ id: user_id }),
      adminEntities.Petition.filter({ creator_user_id: user_id }),
      adminEntities.CredibilityScore.list('-last_calculated_at', 200),
      adminEntities.Comment.filter({ author_user_id: user_id }),
      adminEntities.Report.filter({ reporter_user_id: user_id }),
      adminEntities.ModerationLog.filter({ affected_user_id: user_id }),
      adminEntities.PetitionSignature.filter({ user_id: user_id }),
    ]);

    const targetUser = targetUsers[0];
    if (!targetUser) return Response.json({ error: 'User not found' }, { status: 404 });

    const flags = [];

    // 1. ACCOUNT AGE SCORE (15%) — max 100 after 2 years
    const accountAgeMs = Date.now() - new Date(targetUser.created_date).getTime();
    const accountAgeDays = accountAgeMs / (1000 * 60 * 60 * 24);
    const ageScore = Math.min(100, (accountAgeDays / 730) * 100);

    // 2. VERIFICATION SCORE (15%) — verified = 100, not = 20
    const verificationScore = targetUser.is_verified ? 100 : 20;

    // 3. PETITION CREDIBILITY SCORE (25%)
    let petitionScore = 50; // baseline for new users
    if (petitions.length > 0) {
      const petitionCredMap = Object.fromEntries(credScores.map(c => [c.petition_id, c]));
      const scored = petitions.filter(p => petitionCredMap[p.id]);
      if (scored.length > 0) {
        const avgCred = scored.reduce((sum, p) => sum + (petitionCredMap[p.id]?.overall_score || 50), 0) / scored.length;
        const suspiciousCount = scored.filter(p => petitionCredMap[p.id]?.badge === 'suspicious').length;
        petitionScore = Math.max(0, avgCred - suspiciousCount * 10);
        if (suspiciousCount > 0) flags.push(`${suspiciousCount} suspicious petition(s)`);
      } else {
        petitionScore = 40; // petitions exist but no credibility calculated yet
      }
    }

    // 4. PARTICIPATION QUALITY SCORE (15%)
    let participationScore = 50;
    if (comments.length > 0) {
      const totalLikes = comments.reduce((s, c) => s + (c.likes_count || 0), 0);
      const totalDislikes = comments.reduce((s, c) => s + (c.dislikes_count || 0), 0);
      const removedCount = comments.filter(c => c.is_removed).length;
      const ratio = totalLikes / Math.max(1, totalLikes + totalDislikes);
      const penalty = Math.min(0.5, removedCount * 0.1);
      participationScore = Math.min(100, ratio * 80 + Math.min(20, comments.length * 0.5)) * (1 - penalty);
      if (removedCount > 2) flags.push(`${removedCount} comments removed`);
    }

    // 5. REPORT ACCURACY SCORE (15%)
    let reportScore = 50;
    if (reports.length > 0) {
      const validReports = reports.filter(r => r.status === 'action_taken').length;
      const dismissedReports = reports.filter(r => r.status === 'dismissed').length;
      const accuracy = validReports / Math.max(1, validReports + dismissedReports);
      reportScore = Math.round(accuracy * 100);
      if (dismissedReports > validReports && dismissedReports > 3) {
        flags.push('High false report rate');
        reportScore = Math.max(0, reportScore - 20);
      }
    }

    // 6. MODERATION HISTORY SCORE (15%)
    let moderationScore = 100;
    const warnings = moderationLogs.filter(m => m.action_type === 'user_warned').length;
    const suspensions = moderationLogs.filter(m => m.action_type === 'user_suspended').length;
    const bans = moderationLogs.filter(m => m.action_type === 'user_banned').length;
    moderationScore = Math.max(0, 100 - warnings * 10 - suspensions * 25 - bans * 100);
    if (bans > 0) { flags.push('Previous ban on record'); moderationScore = 0; }
    if (suspensions > 0) flags.push(`${suspensions} suspension(s)`);
    if (warnings > 0) flags.push(`${warnings} warning(s)`);

    // WEIGHTED FINAL SCORE
    const rawScore = (
      ageScore * 0.15 +
      verificationScore * 0.15 +
      petitionScore * 0.25 +
      participationScore * 0.15 +
      reportScore * 0.15 +
      moderationScore * 0.15
    );

    // Fetch any existing manual adjustment
    const existing = await adminEntities.UserInfluenceScore.filter({ user_id });
    const manualAdj = existing.length > 0 ? (existing[0].manual_adjustment || 0) : 0;
    const isRestricted = existing.length > 0 ? (existing[0].is_restricted || false) : false;
    const isPromoted = existing.length > 0 ? (existing[0].is_promoted || false) : false;

    let finalScore = Math.min(100, Math.max(0, rawScore + manualAdj));
    if (isRestricted) finalScore = Math.min(finalScore, 19);
    if (isPromoted) finalScore = Math.max(finalScore, 75);

    // Abuse prevention: cap rapid gain at 5 points per day if not admin
    if (existing.length > 0 && existing[0].last_calculated_at) {
      const lastCalc = new Date(existing[0].last_calculated_at);
      const hoursSince = (Date.now() - lastCalc.getTime()) / (1000 * 60 * 60);
      if (hoursSince < 24) {
        const prevScore = existing[0].overall_score || 50;
        const maxGain = 5 * (hoursSince / 24);
        finalScore = Math.min(finalScore, prevScore + maxGain);
      }
    }

    // Determine influence level
    let influenceLevel = 'standard_user';
    if (finalScore >= 90) influenceLevel = 'trusted_leader';
    else if (finalScore >= 75) influenceLevel = 'highly_trusted';
    else if (finalScore >= 60) influenceLevel = 'trusted_user';
    else if (finalScore >= 40) influenceLevel = 'standard_user';
    else if (finalScore >= 20) influenceLevel = 'low_trust';
    else influenceLevel = 'restricted_user';

    const scoreData = {
      user_id,
      user_email: targetUser.email,
      user_display_name: targetUser.display_name || targetUser.full_name,
      overall_score: Math.round(finalScore * 10) / 10,
      influence_level: influenceLevel,
      age_score: Math.round(ageScore),
      verification_score: Math.round(verificationScore),
      petition_score: Math.round(petitionScore),
      participation_score: Math.round(participationScore),
      report_score: Math.round(reportScore),
      moderation_score: Math.round(moderationScore),
      manual_adjustment: manualAdj,
      is_restricted: isRestricted,
      is_promoted: isPromoted,
      flags,
      last_calculated_at: new Date().toISOString(),
    };

    if (existing.length > 0) {
      await adminEntities.UserInfluenceScore.update(existing[0].id, scoreData);
    } else {
      await adminEntities.UserInfluenceScore.create(scoreData);
    }

    return Response.json({ success: true, score: scoreData });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});