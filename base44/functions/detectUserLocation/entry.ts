import { createSupabaseContext } from '../lib/supabaseContext.ts';
import { siteOrigin } from '../_shared/siteUrl.ts';
import { checkRateLimit, rateLimitResponse } from '../_shared/rateLimiter.ts';

const corsHeaders = (): Record<string, string> => ({
  'Access-Control-Allow-Origin': siteOrigin(),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() });
  }

  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405, headers: corsHeaders() });
  }

  const ip =
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown';
  const rl = await checkRateLimit(ip, 'detectUserLocation', 60, 60);
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  try {
    const { adminEntities, getUser } = createSupabaseContext(req);
    const user = await getUser();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders() });
    }

    const userSettings = await adminEntities.UserHeaderSettings?.filter?.({
      user_id: user.id,
    }) || [];

    if (userSettings.length > 0 && userSettings[0].preferred_location) {
      return Response.json({ location: userSettings[0].preferred_location }, { headers: corsHeaders() });
    }

    return Response.json({ location: 'global' }, { headers: corsHeaders() });
  } catch (error) {
    console.error('Error in detectUserLocation:', error);
    return Response.json({ error: 'Internal error' }, { status: 500, headers: corsHeaders() });
  }
});
