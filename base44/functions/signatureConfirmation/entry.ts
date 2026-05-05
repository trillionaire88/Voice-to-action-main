import { createSupabaseContext } from '../lib/supabaseContext.ts';

/**
 * Canonical origin for signature confirmation links.
 * Set APP_ORIGIN in Supabase secrets when callers do not send Origin (e.g. server-to-server).
 * Falls back to SERVER_ORIGIN / APP_URL / Host when needed.
 */
function resolveCanonicalOrigin(req: Request): string {
  const primary = (Deno.env.get('APP_ORIGIN') ?? req.headers.get('origin') ?? '').trim().replace(/\/+$/, '');
  if (primary) return primary;
  const fromEnv =
    Deno.env.get('SERVER_ORIGIN') ||
    Deno.env.get('APP_URL') ||
    Deno.env.get('SITE_URL') ||
    Deno.env.get('VITE_APP_URL');
  if (fromEnv?.trim()) return fromEnv.replace(/\/+$/, '');
  const host = req.headers.get('host') || req.headers.get('x-forwarded-host');
  if (host?.trim()) {
    const proto = (req.headers.get('x-forwarded-proto') || 'https').split(',')[0].trim();
    const h = host.split(',')[0].trim();
    return `${proto}://${h}`;
  }
  throw new Error(
    'Cannot build confirmation URL: set APP_ORIGIN or SERVER_ORIGIN/APP_URL (or send Origin/Host).',
  );
}

Deno.serve(async (req) => {
  try {
    const { supabase, supabaseAdmin, entities, adminEntities, integrations, getUser } = createSupabaseContext(req);
    const { petition_id, petition_title, signer_name, signer_email, token } = await req.json();

    if (!petition_id || !signer_email || !token) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const origin = resolveCanonicalOrigin(req);
    const confirmUrl = `${origin}/PetitionDetail?id=${petition_id}&confirm_sig=${token}`;

    await integrations.Core.SendEmail({
      to: signer_email,
      subject: `Please confirm your signature — ${petition_title}`,
      body: `Hi ${signer_name},\n\nThank you for signing "${petition_title}".\n\nPlease click the link below to confirm your signature:\n\n${confirmUrl}\n\nThis link expires in 24 hours. If you did not sign this petition, you can safely ignore this email.\n\n— Voice to Action`,
    });

    console.log(`[signatureConfirmation] Confirmation email sent to ${signer_email} for petition ${petition_id}`);
    return Response.json({ success: true });
  } catch (error) {
    console.error('[signatureConfirmation] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});