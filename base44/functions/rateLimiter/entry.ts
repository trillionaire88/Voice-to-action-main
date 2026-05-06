import { createSupabaseContext } from '../lib/supabaseContext.ts';

/**
 * rateLimiter — server-side rate limiting for all critical user actions
 */

const LIMITS = {
  sign_petition:      { max: 3,   windowSeconds: 300   },
  vote_poll:          { max: 10,  windowSeconds: 300   },
  create_petition:    { max: 5,   windowSeconds: 3600  },
  create_poll:        { max: 10,  windowSeconds: 3600  },
  create_community:   { max: 3,   windowSeconds: 86400 },
  post_discussion:    { max: 20,  windowSeconds: 600   },
  post_comment:       { max: 30,  windowSeconds: 600   },
  submit_report:      { max: 10,  windowSeconds: 3600  },
  send_message:       { max: 50,  windowSeconds: 600   },
  search_query:       { max: 60,  windowSeconds: 60    },
  api_default:        { max: 100, windowSeconds: 60    },
};

Deno.serve(async (req) => {
  try {
    const { supabase, supabaseAdmin, entities, adminEntities, integrations, getUser } = createSupabaseContext(req);
    const user = await getUser().catch(() => null);
    const body = await req.json().catch(() => ({}));
    const { action, identifier } = body;

    if (!action) return Response.json({ error: 'action required' }, { status: 400 });

    // Owners and admins bypass rate limiting
    if (user?.role === 'owner_admin' || user?.role === 'admin') {
      return Response.json({ allowed: true, bypassed: true });
    }

    const limitConfig = LIMITS[action] || LIMITS.api_default;
    const windowMs = limitConfig.windowSeconds * 1000;
    const windowStart = new Date(Date.now() - windowMs).toISOString();

    const limitKey = user?.id || identifier || 'anonymous';
    const trackingKey = `${action}:${limitKey}`;

    const recentEvents = await adminEntities.RateLimitTracker.filter({
      tracking_key: trackingKey,
      is_blocked: false,
    });

    const inWindow = recentEvents.filter(e => e.created_date > windowStart);

    if (inWindow.length >= limitConfig.max) {
      const oldestInWindow = inWindow.sort((a, b) =>
        new Date(a.created_date).getTime() - new Date(b.created_date).getTime()
      )[0];
      const retryAfter = Math.ceil(
        (new Date(oldestInWindow.created_date).getTime() + windowMs - Date.now()) / 1000
      );

      await adminEntities.RateLimitTracker.create({
        tracking_key: trackingKey,
        action,
        user_id: user?.id || null,
        identifier: limitKey,
        is_blocked: true,
        window_end: new Date(Date.now() + windowMs).toISOString(),
      }).catch(() => {});

      console.warn(`[RateLimiter] BLOCKED ${action} for ${limitKey} (${inWindow.length}/${limitConfig.max} in window)`);

      return Response.json({
        allowed: false,
        reason: `Too many ${action.replace(/_/g, ' ')} requests. Please slow down.`,
        retry_after_seconds: Math.max(1, retryAfter),
        limit: limitConfig.max,
        window_seconds: limitConfig.windowSeconds,
      });
    }

    await adminEntities.RateLimitTracker.create({
      tracking_key: trackingKey,
      action,
      user_id: user?.id || null,
      identifier: limitKey,
      is_blocked: false,
      window_end: new Date(Date.now() + windowMs).toISOString(),
    }).catch(() => {});

    return Response.json({
      allowed: true,
      remaining: limitConfig.max - inWindow.length - 1,
      limit: limitConfig.max,
      window_seconds: limitConfig.windowSeconds,
    });

  } catch (error) {
    console.error('[RateLimiter] Error:', error.message);
    return Response.json({ allowed: true, error: 'rate_limiter_error' });
  }
});