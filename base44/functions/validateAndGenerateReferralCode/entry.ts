import { createSupabaseContext } from '../lib/supabaseContext.ts';

const isValidCodeFormat = (code) => {
  const pattern = /^[A-Z0-9]{6,10}$/;
  return pattern.test(code);
};

const generateCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const length = Math.floor(Math.random() * 5) + 6;
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

Deno.serve(async (req) => {
  try {
    const { supabase, supabaseAdmin, entities, adminEntities, integrations, getUser } = createSupabaseContext(req);
    const { codeToValidate } = await req.json();

    let finalCode = codeToValidate;

    if (codeToValidate && isValidCodeFormat(codeToValidate.toUpperCase())) {
      const existing = await entities.ReferralCode.filter({
        code: codeToValidate.toUpperCase()
      });

      if (existing.length > 0) {
        return Response.json({
          error: 'Code already exists',
          code: null,
          suggestion: generateCode(),
          valid: false
        }, { status: 400 });
      }
      finalCode = codeToValidate.toUpperCase();
    } else if (codeToValidate) {
      return Response.json({
        error: 'Invalid code format (6-10 alphanumeric characters)',
        code: null,
        suggestion: generateCode(),
        valid: false
      }, { status: 400 });
    } else {
      finalCode = generateCode();
    }

    return Response.json({
      success: true,
      code: finalCode,
      format: 'valid',
      ready: true
    });
  } catch (error) {
    console.error('validateAndGenerateReferralCode error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});