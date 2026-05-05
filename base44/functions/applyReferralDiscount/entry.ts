import { createSupabaseContext } from '../lib/supabaseContext.ts';

Deno.serve(async (req) => {
  try {
    const { supabase, supabaseAdmin, entities, adminEntities, integrations, getUser } = createSupabaseContext(req);
    const { code, originalAmount } = await req.json();

    if (!code || !originalAmount) {
      return Response.json({ error: 'Missing code or amount' }, { status: 400 });
    }

    const referralCodes = await entities.ReferralCode.filter({
      code: code.toUpperCase(),
      active: true
    });

    if (!referralCodes.length) {
      return Response.json({ error: 'Invalid or inactive referral code' }, { status: 404 });
    }

    const record = referralCodes[0];
    const discountPercent = record.discount_percent || 10;
    const discountAmount = Math.round(originalAmount * (discountPercent / 100));
    const finalAmount = originalAmount - discountAmount;

    return Response.json({
      success: true,
      code: record.code,
      discountPercent,
      originalAmount,
      discountAmount,
      finalAmount,
      codeOwnerId: record.owner_user_id,
      commissionPercent: record.commission_percent
    });
  } catch (error) {
    console.error('applyReferralDiscount error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});