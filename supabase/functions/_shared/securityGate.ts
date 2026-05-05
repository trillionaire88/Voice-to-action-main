import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getClientIP, detectBot, auditLog, secureErrorResponse } from "./securityMiddleware.ts";

export async function runSecurityGate(
  req: Request,
  supabase: SupabaseClient,
  options: {
    endpointName: string;
    requireAuth?: boolean;
    blockBots?: boolean;
    checkIPBlock?: boolean;
  },
): Promise<Response | null> {
  const ip = getClientIP(req);
  const userAgent = req.headers.get("user-agent") || "";

  if (options.blockBots && detectBot(userAgent)) {
    await auditLog(supabase, {
      event_type: "bot_blocked",
      severity: "warning",
      ip_address: ip,
      user_agent: userAgent,
      endpoint: options.endpointName,
    });
    return secureErrorResponse(403, "Forbidden");
  }

  if (options.checkIPBlock) {
    const { data: threat } = await supabase
      .from("threat_intelligence")
      .select("blocked, blocked_until")
      .eq("ip_address", ip)
      .eq("blocked", true)
      .maybeSingle();

    if (threat?.blocked) {
      const isStillBlocked = !threat.blocked_until || new Date(threat.blocked_until) > new Date();
      if (isStillBlocked) {
        await auditLog(supabase, {
          event_type: "blocked_ip_attempt",
          severity: "high",
          ip_address: ip,
          endpoint: options.endpointName,
        });
        return secureErrorResponse(403, "Forbidden");
      }
    }
  }

  if (req.method === "POST") {
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("application/json") && !contentType.includes("text/plain") && !contentType.includes("application/x-www-form-urlencoded")) {
      return secureErrorResponse(400, "Bad request");
    }
  }

  const contentLength = parseInt(req.headers.get("content-length") || "0");
  if (contentLength > 1_048_576) {
    await auditLog(supabase, {
      event_type: "oversized_request",
      severity: "warning",
      ip_address: ip,
      endpoint: options.endpointName,
      details: { content_length: contentLength },
    });
    return secureErrorResponse(413, "Payload too large");
  }

  return null;
}
