import { createSupabaseContext } from '../lib/supabaseContext.ts';

/**
 * contentModerator — scans submitted content before it's stored
 */

function normalise(text) {
  return text.toLowerCase()
    .replace(/[@4]/g, 'a').replace(/[3]/g, 'e').replace(/[1!|]/g, 'i')
    .replace(/[0]/g, 'o').replace(/[$5]/g, 's').replace(/[7]/g, 't')
    .replace(/\s+/g, ' ').trim();
}

const CRITICAL_PATTERNS = [
  /\bcsam\b/,
  /child.{0,10}(?:porn|exploit|abuse|sex)/,
  /\bhitman\b/,
  /\bhire.{0,10}kill/,
  /\bhuman.{0,10}traffickin/,
  /\bsex.{0,10}traffickin/,
];

const HIGH_PATTERNS = [
  /\bkill\s+(?:all\s+)?(?:the\s+)?\w+s\b/,
  /\b(?:shoot|bomb|stab|murder)\s+\w+/,
  /\bterrorist\s+attack/,
  /\bI\s+will\s+(?:kill|hurt|harm|attack)\b/,
];

const MEDIUM_PATTERNS = [
  /\bhate\s+(?:all\s+)?\w+s\b/,
  /\b(?:nigger|faggot|chink|spic)\b/,
  /\bgo\s+kill\s+yourself\b/,
];

const SPAM_PATTERNS = [
  /(?:click\s+here|buy\s+now|limited\s+time|act\s+now).{0,30}http/i,
  /\b(?:crypto|bitcoin|forex|investment)\s+(?:profit|return|earn)\b/i,
  /(https?:\/\/\S+){3,}/,
  /(.)\1{10,}/,
];

function scanText(rawText) {
  if (!rawText || rawText.trim().length === 0) {
    return { approved: false, severity: 'none', reason: 'Content cannot be empty', flags: [], requires_review: false };
  }

  if (rawText.length > 100000) {
    return { approved: false, severity: 'low', reason: 'Content exceeds maximum length', flags: ['too_long'], requires_review: false };
  }

  const text = normalise(rawText);
  const flags = [];

  for (const pattern of CRITICAL_PATTERNS) {
    if (pattern.test(text)) {
      return { approved: false, severity: 'critical', reason: 'This content violates our community safety policy and cannot be posted.', flags: ['critical_content'], requires_review: true };
    }
  }

  for (const pattern of HIGH_PATTERNS) {
    if (pattern.test(text)) {
      return { approved: false, severity: 'high', reason: 'This content contains language that may constitute a threat. It has been flagged for review.', flags: ['violent_threat'], requires_review: true };
    }
  }

  let spamCount = 0;
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(rawText)) spamCount++;
  }
  if (spamCount >= 2) {
    return { approved: false, severity: 'medium', reason: 'This content has been detected as spam.', flags: ['spam_detected'], requires_review: false };
  }

  for (const pattern of MEDIUM_PATTERNS) {
    if (pattern.test(text)) flags.push('hate_speech_possible');
  }

  const requiresReview = flags.length > 0;

  return {
    approved: true,
    severity: requiresReview ? 'medium' : 'none',
    reason: null,
    flags,
    requires_review: requiresReview,
  };
}

Deno.serve(async (req) => {
  try {
    const { supabase, supabaseAdmin, entities, adminEntities, integrations, getUser } = createSupabaseContext(req);
    const user = await getUser().catch(() => null);
    const body = await req.json().catch(() => ({}));
    const { content, content_type, title, description } = body;

    const combined = [title, description, content].filter(Boolean).join(' ');
    const result = scanText(combined);

    if (result.requires_review && user) {
      await adminEntities.RiskAlert.create({
        risk_type: result.flags[0] || 'content_flag',
        severity: result.severity,
        status: 'open',
        subject_user_id: user.id,
        subject_content_type: content_type || 'unknown',
        description: `Auto-moderation flagged ${content_type || 'content'} from user ${user.id}: ${result.flags.join(', ')}`,
        evidence: { flags: result.flags, severity: result.severity },
      }).catch(e => console.error('[ContentModerator] RiskAlert create error:', e.message));
    }

    console.log(`[ContentModerator] Scan result: approved=${result.approved}, severity=${result.severity}, flags=${result.flags.join(',')}`);
    return Response.json(result);

  } catch (error) {
    console.error('[ContentModerator] Error:', error.message);
    return Response.json({ approved: true, severity: 'none', reason: null, flags: [], requires_review: false });
  }
});