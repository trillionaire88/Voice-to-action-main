import { createSupabaseContext } from '../lib/supabaseContext.ts';

Deno.serve(async (req) => {
  try {
    const { supabase, supabaseAdmin, entities, adminEntities, integrations, getUser } = createSupabaseContext(req);

    const now = new Date().toISOString();

    // Find all unconfirmed signatures that have passed their expiry
    const allUnconfirmed = await adminEntities.PetitionSignature.filter({
      is_email_confirmed: false,
      is_invalidated: false,
    });

    const expired = allUnconfirmed.filter(sig => sig.expires_at && sig.expires_at < now);

    if (expired.length === 0) {
      console.log('[cleanupExpiredSignatures] No expired signatures found.');
      return Response.json({ success: true, expired_count: 0 });
    }

    // Group by petition so we can update counts
    const petitionDecrements = {};
    for (const sig of expired) {
      if (!petitionDecrements[sig.petition_id]) {
        petitionDecrements[sig.petition_id] = 0;
      }
      petitionDecrements[sig.petition_id]++;
    }

    // Invalidate all expired signatures
    for (const sig of expired) {
      await adminEntities.PetitionSignature.update(sig.id, {
        is_invalidated: true,
        invalidated_at: now,
        invalidation_reason: 'Email confirmation not completed within 24 hours',
      });
    }

    // Update petition counts
    for (const [petitionId, decrementBy] of Object.entries(petitionDecrements)) {
      const petitions = await adminEntities.Petition.filter({ id: petitionId });
      if (petitions.length > 0) {
        const p = petitions[0];
        await adminEntities.Petition.update(petitionId, {
          signature_count_total: Math.max(0, (p.signature_count_total || 0) - decrementBy),
        });
      }
    }

    console.log(`[cleanupExpiredSignatures] Invalidated ${expired.length} expired signatures across ${Object.keys(petitionDecrements).length} petitions.`);
    return Response.json({ success: true, expired_count: expired.length });
  } catch (error) {
    console.error('[cleanupExpiredSignatures] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});