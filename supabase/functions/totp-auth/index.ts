import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, rateLimitResponse } from "../_shared/rateLimiter.ts";

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function base32Decode(encoded: string): Uint8Array {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const cleaned = encoded.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const output: number[] = [];
  for (const char of cleaned) {
    value = (value << 5) | alphabet.indexOf(char);
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return new Uint8Array(output);
}

function base32Encode(data: Uint8Array): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let result = "";
  let bits = 0;
  let value = 0;
  for (const byte of data) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      result += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) result += alphabet[(value << (5 - bits)) & 31];
  return result;
}

async function generateTOTP(secret: string, timeCounter?: number): Promise<string> {
  const key = base32Decode(secret);
  const counter = timeCounter ?? Math.floor(Date.now() / 1000 / 30);
  const counterBytes = new Uint8Array(8);
  let temp = counter;
  for (let i = 7; i >= 0; i--) {
    counterBytes[i] = temp & 0xff;
    temp = Math.floor(temp / 256);
  }

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, counterBytes);
  const hash = new Uint8Array(signature);
  const offset = hash[hash.length - 1] & 0xf;
  const code =
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff);
  return String(code % 1000000).padStart(6, "0");
}

async function verifyTOTP(secret: string, token: string): Promise<boolean> {
  const t = Math.floor(Date.now() / 1000 / 30);
  for (const delta of [-1, 0, 1]) {
    const expected = await generateTOTP(secret, t + delta);
    if (expected === token) return true;
  }
  return false;
}

async function sha256hex(input: string): Promise<string> {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function getAesKey(): Promise<CryptoKey> {
  const raw = Deno.env.get("TOTP_ENCRYPTION_KEY") || "fallback-key-change-me-32chars!!";
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return crypto.subtle.importKey("raw", hash, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

function isProbablyEncrypted(stored: string): boolean {
  try {
    const raw = Uint8Array.from(atob(stored), (c) => c.charCodeAt(0));
    return raw.length >= 12 + 16;
  } catch {
    return false;
  }
}

async function encryptTotpSecret(plain: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await getAesKey();
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plain),
  );
  const combined = new Uint8Array(iv.length + ct.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ct), iv.length);
  return btoa(String.fromCharCode(...combined));
}

async function decryptTotpSecret(stored: string): Promise<string> {
  if (!isProbablyEncrypted(stored)) return stored;
  const raw = Uint8Array.from(atob(stored), (c) => c.charCodeAt(0));
  const iv = raw.slice(0, 12);
  const ct = raw.slice(12);
  const key = await getAesKey();
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return new TextDecoder().decode(pt);
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || "unknown";
  const rl = await checkRateLimit(ip, "totp-auth", 10, 60);
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return jsonResponse({ error: "Unauthorized" }, 401);

  const bearer = authHeader.replace("Bearer ", "");
  const {
    data: { user },
  } = await supabase.auth.getUser(bearer);
  if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

  const body = await req.json().catch(() => ({}));
  const { action } = body as { action?: string; token?: string };

  if (action === "setup") {
    const rawSecret = crypto.getRandomValues(new Uint8Array(20));
    const secret = base32Encode(rawSecret);
    const encrypted = await encryptTotpSecret(secret);

    await supabase.from("user_totp").upsert(
      {
        user_id: user.id,
        encrypted_secret: encrypted,
        is_enabled: false,
        backup_codes: [],
      },
      { onConflict: "user_id" },
    );

    const appName = "Voice+to+Action";
    const otpauthUrl =
      `otpauth://totp/${appName}:${encodeURIComponent(user.email ?? user.id)}?secret=${secret}&issuer=${appName}&algorithm=SHA1&digits=6&period=30`;

    return jsonResponse({
      secret,
      otpauth_url: otpauthUrl,
      qr_url: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}`,
    });
  }

  if (action === "enable") {
    const token = body.token as string | undefined;
    if (!token) return jsonResponse({ error: "token required" }, 400);

    const { data: totpRecord } = await supabase
      .from("user_totp")
      .select("encrypted_secret, is_enabled")
      .eq("user_id", user.id)
      .single();

    if (!totpRecord) return jsonResponse({ error: "TOTP not set up" }, 400);
    if (totpRecord.is_enabled) return jsonResponse({ error: "TOTP already enabled" }, 400);

    const plainSecret = await decryptTotpSecret(totpRecord.encrypted_secret as string);
    const valid = await verifyTOTP(plainSecret, token);
    if (!valid) return jsonResponse({ error: "Invalid code. Try again." }, 400);

    const backupCodes: string[] = [];
    const backupHashes: string[] = [];
    for (let i = 0; i < 10; i++) {
      const code = Array.from(crypto.getRandomValues(new Uint8Array(5)))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
        .toUpperCase();
      backupCodes.push(`${code.slice(0, 5)}-${code.slice(5)}`);
      backupHashes.push(await sha256hex(code));
    }

    await supabase
      .from("user_totp")
      .update({
        is_enabled: true,
        enabled_at: new Date().toISOString(),
        backup_codes: backupHashes,
      })
      .eq("user_id", user.id);

    await supabase.from("profiles").update({ mfa_enabled: true }).eq("id", user.id);

    return jsonResponse({
      success: true,
      backup_codes: backupCodes,
      message: "2FA enabled. Save your backup codes — they will not be shown again.",
    });
  }

  if (action === "verify") {
    const token = body.token as string | undefined;
    if (!token) return jsonResponse({ error: "token required" }, 400);

    const { data: totpRecord } = await supabase
      .from("user_totp")
      .select("encrypted_secret, is_enabled, failed_attempts, locked_until")
      .eq("user_id", user.id)
      .single();

    if (!totpRecord?.is_enabled) {
      return jsonResponse({ verified: true, reason: "2fa_not_enabled" });
    }

    if (totpRecord.locked_until && new Date(totpRecord.locked_until as string) > new Date()) {
      return jsonResponse({ error: "Too many failed attempts. Try again later." }, 429);
    }

    const plainSecret = await decryptTotpSecret(totpRecord.encrypted_secret as string);
    const valid = await verifyTOTP(plainSecret, token);

    if (!valid) {
      const newFails = (Number(totpRecord.failed_attempts) || 0) + 1;
      const shouldLock = newFails >= 5;
      await supabase
        .from("user_totp")
        .update({
          failed_attempts: newFails,
          locked_until: shouldLock
            ? new Date(Date.now() + 15 * 60 * 1000).toISOString()
            : null,
        })
        .eq("user_id", user.id);

      return jsonResponse(
        {
          verified: false,
          error: shouldLock
            ? "Account locked for 15 minutes after 5 failed attempts."
            : "Invalid code.",
          attempts_remaining: Math.max(0, 5 - newFails),
        },
        400,
      );
    }

    await supabase
      .from("user_totp")
      .update({
        failed_attempts: 0,
        locked_until: null,
        last_used_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    return jsonResponse({ verified: true });
  }

  if (action === "disable") {
    const token = body.token as string | undefined;
    const { data: totpRecord } = await supabase
      .from("user_totp")
      .select("encrypted_secret, is_enabled")
      .eq("user_id", user.id)
      .single();

    if (!totpRecord?.is_enabled) return jsonResponse({ error: "Not enabled" }, 400);

    const plainSecret = await decryptTotpSecret(totpRecord.encrypted_secret as string);
    const valid = token ? await verifyTOTP(plainSecret, token) : false;
    if (!valid) return jsonResponse({ error: "Invalid code" }, 400);

    await supabase.from("user_totp").update({ is_enabled: false }).eq("user_id", user.id);
    await supabase.from("profiles").update({ mfa_enabled: false }).eq("id", user.id);

    return jsonResponse({ success: true });
  }

  return jsonResponse({ error: "Unknown action" }, 400);
});
