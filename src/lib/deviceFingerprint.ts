/**
 * Generates a stable device fingerprint from browser characteristics.
 * Used only for security (new device detection). No third-party trackers.
 */
export async function getDeviceFingerprint(): Promise<string> {
  const components = [
    navigator.userAgent,
    navigator.language,
    navigator.platform,
    `${screen.width}x${screen.height}`,
    String(screen.colorDepth),
    String(new Date().getTimezoneOffset()),
    String(navigator.hardwareConcurrency || 0),
    String((navigator as Navigator & { deviceMemory?: number }).deviceMemory || 0),
  ].join("|");

  const encoder = new TextEncoder();
  const data = encoder.encode(components);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function getDeviceLabel(): string {
  const ua = navigator.userAgent;
  let browser = "Unknown browser";
  let os = "Unknown OS";

  if (ua.includes("Chrome") && !ua.includes("Edg")) browser = "Chrome";
  else if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
  else if (ua.includes("Edg")) browser = "Edge";

  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac OS")) os = "Mac";
  else if (ua.includes("iPhone")) os = "iPhone";
  else if (ua.includes("iPad")) os = "iPad";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("Linux")) os = "Linux";

  return `${browser} on ${os}`;
}
