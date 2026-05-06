import { createSupabaseContext } from '../lib/supabaseContext.ts';

Deno.serve(async (req) => {
  try {
    const { supabase, supabaseAdmin, entities, adminEntities, integrations, getUser } = createSupabaseContext(req);
    const {
      referralCode,
      codeOwnerId,
      buyerUserId,
      paymentType,
      originalAmount,
      discountAmount,
      finalAmount,
      commissionPercent,
      stripeSessionId
    } = await req.json();

    if (!referralCode || !codeOwnerId || !buyerUserId || !paymentType) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const commissionAmount = Math.round(finalAmount * (commissionPercent / 100));

    const referralCode_obj = await entities.ReferralCode.filter({
      code: referralCode.toUpperCase()
    });

    const transaction = await adminEntities.ReferralTransaction.create({
      referral_code_id: referralCode_obj[0]?.id,
      referral_code: referralCode.toUpperCase(),
      code_owner_user_id: codeOwnerId,
      buyer_user_id: buyerUserId,
      payment_type: paymentType,
      original_amount_cents: originalAmount,
      discount_amount_cents: discountAmount,
      final_amount_cents: finalAmount,
      commission_percent: commissionPercent,
      commission_amount_cents: commissionAmount,
      status: 'pending',
      stripe_session_id: stripeSessionId
    });

    const user = await adminEntities.User.filter({ id: codeOwnerId });
    if (user.length) {
      const newBalance = (user[0].commission_balance || 0) + commissionAmount;
      await adminEntities.User.update(codeOwnerId, {
        commission_balance: newBalance
      });
    }

    await adminEntities.ReferralCode.update(referralCode_obj[0].id, {
      uses_count: (referralCode_obj[0].uses_count || 0) + 1,
      pending_commission: (referralCode_obj[0].pending_commission || 0) + commissionAmount
    });

    return Response.json({ success: true, transaction, commissionAmount });
  } catch (error) {
    console.error('recordReferralCommission error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});