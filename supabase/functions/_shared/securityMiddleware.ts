import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { siteOrigin } from "./siteUrl.ts";

export const SECURITY_HEADERS = {
  "Access-Control-Allow-Origin": siteOrigin(),
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-request-id",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Content-Security-Policy": "default-src 'none'",
};

// Wildcard CORS intentionally not exported — use SECURITY_HEADERS (siteOrigin). For a truly public
// endpoint, set Access-Control-Allow-Origin inline in that function and document why.

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  blockDurationMs?: number;
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  "auth-login": { windowMs: 60_000, maxRequests: 5, blockDurationMs: 900_000 },
  "auth-register": { windowMs: 3_600_000, maxRequests: 3, blockDurationMs: 86_400_000 },
  "auth-reset-password": { windowMs: 3_600_000, maxRequests: 3, blockDurationMs: 3_600_000 },
  "otp-send": { windowMs: 60_000, maxRequests: 3, blockDurationMs: 300_000 },
  "otp-verify": { windowMs: 60_000, maxRequests: 5, blockDurationMs: 900_000 },
  "stripe-checkout": { windowMs: 3_600_000, maxRequests: 5, blockDurationMs: 3_600_000 },
  "stripe-identity": { windowMs: 3_600_000, maxRequests: 3, blockDurationMs: 86_400_000 },
  "api-default": { windowMs: 60_000, maxRequests: 60, blockDurationMs: 300_000 },
  "api-write": { windowMs: 60_000, maxRequests: 30, blockDurationMs: 300_000 },
  "api-search": { windowMs: 60_000, maxRequests: 20, blockDurationMs: 120_000 },
};

export async function checkRateLimit(
  supabase: SupabaseClient,
  key: string,
  endpointType: string = "api-default",
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const config = RATE_LIMITS[endpointType] || RATE_LIMITS["api-default"];
  const now = new Date();
  const windowStart = new Date(now.getTime() - config.windowMs);

  try {
    const { data: existing } = await supabase
      .from("rate_limit_store")
      .select("count, window_start, blocked_until")
      .eq("key", key)
      .maybeSingle();

    if (existing?.blocked_until && new Date(existing.blocked_until) > now) {
      const retryAfter = Math.ceil((new Date(existing.blocked_until).getTime() - now.getTime()) / 1000);
      return { allowed: false, retryAfter };
    }

    if (existing && new Date(existing.window_start) > windowStart) {
      const newCount = existing.count + 1;
      const blocked = newCount > config.maxRequests;
      const blockedUntil = blocked
        ? new Date(now.getTime() + (config.blockDurationMs || 300_000)).toISOString()
        : null;

      await supabase.from("rate_limit_store").update({
        count: newCount,
        blocked_until: blockedUntil,
        updated_at: now.toISOString(),
      }).eq("key", key);

      if (blocked) return { allowed: false, retryAfter: Math.ceil((config.blockDurationMs || 300_000) / 1000) };
    } else {
      await supabase.from("rate_limit_store").upsert({
        key,
        count: 1,
        window_start: now.toISOString(),
        blocked_until: null,
        updated_at: now.toISOString(),
      }, { onConflict: "key" });
    }

    return { allowed: true };
  } catch {
    return { allowed: true };
  }
}

const XSS_PATTERNS = [
  /<script\b[^>]*>[\s\S]*?<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<iframe/gi,
  /<object/gi,
  /<embed/gi,
  /data:text\/html/gi,
  /vbscript:/gi,
  /expression\s*\(/gi,
];

const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|TRUNCATE)\b)/gi,
  /(--|;|\/\*|\*\/)/g,
  /(\bOR\b|\bAND\b)\s+['"]?\d+['"]?\s*=\s*['"]?\d+['"]?/gi,
];

const PATH_TRAVERSAL_PATTERNS = [
  /\.\.\//g,
  /\.\.\\/g,
  /%2e%2e%2f/gi,
  /%252e%252e%252f/gi,
];

export function sanitiseInput(value: unknown): unknown {
  if (typeof value === "string") {
    const sanitised = value.trim();

    for (const pattern of [...XSS_PATTERNS, ...SQL_INJECTION_PATTERNS, ...PATH_TRAVERSAL_PATTERNS]) {
      if (pattern.test(sanitised)) throw new Error("SECURITY_VIOLATION: Suspicious pattern detected in input");
    }
    if (sanitised.length > 50_000) throw new Error("SECURITY_VIOLATION: Input exceeds maximum allowed length");
    return sanitised;
  }

  if (Array.isArray(value)) {
    if (value.length > 1000) throw new Error("SECURITY_VIOLATION: Array exceeds maximum allowed length");
    return value.map(sanitiseInput);
  }

  if (value !== null && typeof value === "object") {
    const sanitised: Record<string, unknown> = {};
    const keys = Object.keys(value as object);
    if (keys.length > 100) throw new Error("SECURITY_VIOLATION: Object has too many keys");
    for (const key of keys) sanitised[key] = sanitiseInput((value as Record<string, unknown>)[key]);
    return sanitised;
  }

  return value;
}

export async function auditLog(
  supabase: SupabaseClient,
  event: {
    user_id?: string;
    event_type: string;
    severity: "info" | "warning" | "high" | "critical";
    ip_address?: string;
    user_agent?: string;
    endpoint?: string;
    details?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    const detailsStr = JSON.stringify(event.details || {});
    const encoder = new TextEncoder();
    const data = encoder.encode(detailsStr + new Date().toISOString());
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const chainHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    await supabase.from("security_audit_log").insert({
      user_id: event.user_id || null,
      event_type: event.event_type,
      severity: event.severity,
      ip_address: event.ip_address || null,
      user_agent: event.user_agent?.substring(0, 512) || null,
      endpoint: event.endpoint || null,
      details: event.details || {},
      chain_hash: chainHash,
    });
  } catch (err) {
    console.error("[AuditLog] Failed to write audit log:", err);
  }
}

const KNOWN_BOT_AGENTS = [
  "bot", "crawler", "spider", "scraper", "wget", "curl", "python-requests",
  "go-http-client", "java/", "libwww-perl", "ruby", "php/", "headless",
  "puppeteer", "playwright", "selenium", "phantomjs", "nightmare",
];

export function detectBot(userAgent: string): boolean {
  if (!userAgent || userAgent.length < 10) return true;
  const ua = userAgent.toLowerCase();
  return KNOWN_BOT_AGENTS.some((bot) => ua.includes(bot));
}

export function getClientIP(req: Request): string {
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

export async function getAuthenticatedUser(
  req: Request,
  supabase: SupabaseClient,
): Promise<{ user: any; error: string | null }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return { user: null, error: "Missing or invalid Authorization header" };

  const token = authHeader.replace("Bearer ", "").trim();
  if (!token || token.length < 20) return { user: null, error: "Invalid token format" };

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return { user: null, error: "Invalid or expired token" };
  return { user, error: null };
}

export function validateUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length < 255;
}

export function validateTextLength(text: string, min: number, max: number): boolean {
  return text.length >= min && text.length <= max;
}

/** Simpler XSS-oriented sanitiser for JSON bodies (non-throwing). */
export function sanitiseInputLoose(input: unknown): unknown {
  if (typeof input === "string") {
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/javascript:/gi, "")
      .replace(/on\w+\s*=/gi, "")
      .trim();
  }
  if (Array.isArray(input)) return input.map(sanitiseInputLoose);
  if (input && typeof input === "object") {
    return Object.fromEntries(
      Object.entries(input as Record<string, unknown>).map(([k, v]) => [k, sanitiseInputLoose(v)]),
    );
  }
  return input;
}

export async function logSecurityEvent(
  supabase: SupabaseClient,
  userId: string | null,
  eventType: string,
  detail: string,
  ip: string,
): Promise<void> {
  try {
    await supabase.from("security_audit_log").insert({
      user_id: userId,
      event_type: eventType,
      severity: "info",
      details: { detail },
      ip_address: ip || null,
    });
  } catch {
    /* never throw */
  }
}

export function secureErrorResponse(status: number, _message: string): Response {
  const safeMessages: Record<number, string> = {
    400: "Bad request",
    401: "Authentication required",
    403: "Access denied",
    404: "Not found",
    413: "Payload too large",
    429: "Too many requests",
    500: "An error occurred",
  };
  return new Response(JSON.stringify({ error: safeMessages[status] || "An error occurred" }), {
    status,
    headers: { ...SECURITY_HEADERS, "Content-Type": "application/json" },
  });
}
