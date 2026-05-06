import { createSupabaseContext } from '../lib/supabaseContext.ts';

const generateCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  const length = Math.random() > 0.5 ? 8 : 10;
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

Deno.serve(async (req) => {
  try {
    const { supabase, supabaseAdmin, entities, adminEntities, integrations, getUser } = createSupabaseContext(req);
    const user = await getUser();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let code;
    let exists = true;
    let attempts = 0;

    while (exists && attempts < 10) {
      code = generateCode();
      const existing = await entities.ReferralCode.filter({ 
        code: code.toUpperCase(),
        owner_user_id: user.id
      });
      exists = existing.length > 0;
      attempts++;
    }

    if (exists) {
      return Response.json({ error: 'Failed to generate unique code' }, { status: 500 });
    }

    const referralCode = await adminEntities.ReferralCode.create({
      code: code.toUpperCase(),
      owner_user_id: user.id,
      unique_key: `${code.toUpperCase()}_${user.id}`,
      discount_percent: 10,
      commission_percent: 5,
      active: true
    });

    return Response.json({ success: true, code: referralCode });
  } catch (error) {
    console.error('generateUniqueReferralCode error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});