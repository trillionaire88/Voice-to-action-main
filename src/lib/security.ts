export function lockPrototypes(): void {
  try {
    Object.freeze(Object.prototype);
    Object.freeze(Array.prototype);
    Object.freeze(Function.prototype);
  } catch {
    // noop
  }
}

// Build fresh RegExp instances per call to prevent stale lastIndex issues.
function getDangerousPatterns(): RegExp[] {
  return [
    /<script\b[^>]*>[\s\S]*?<\/script>/gi,
    /javascript:/gi,
    /data:text\/html/gi,
    /on\w+\s*=/gi,
    /<iframe/gi,
  ];
}

export function sanitiseUserInput(value: string): string {
  let clean = value;
  for (const pattern of getDangerousPatterns()) clean = clean.replace(pattern, "");
  return clean.trim();
}

export function generateSessionFingerprint(): string {
  const components = [
    navigator.userAgent,
    navigator.language,
    `${screen.width}x${screen.height}x${screen.colorDepth}`,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.hardwareConcurrency?.toString() || "0",
  ];
  return btoa(components.join("|")).substring(0, 64);
}

let inactivityTimer: ReturnType<typeof setTimeout> | null = null;
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;

export function startInactivityTimer(onTimeout: () => void): void {
  const reset = () => {
    if (inactivityTimer) clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(onTimeout, INACTIVITY_TIMEOUT_MS);
  };
  ["mousemove", "keydown", "touchstart", "click", "scroll"].forEach((event) => {
    document.addEventListener(event, reset, { passive: true });
  });
  reset();
}

export function stopInactivityTimer(): void {
  if (inactivityTimer) {
    clearTimeout(inactivityTimer);
    inactivityTimer = null;
  }
}

export function protectSensitiveText(): void {
  document.addEventListener("copy", () => {
    const selection = window.getSelection()?.toString() || "";
    if (/^(sk_|pk_|eyJ|Bearer )/i.test(selection.trim())) {
      console.warn("[Security] Sensitive value copied to clipboard");
    }
  });
}

let devtoolsOpen = false;
export function monitorDevtools(): void {
  const threshold = 160;
  const check = () => {
    const widthThreshold = window.outerWidth - window.innerWidth > threshold;
    const heightThreshold = window.outerHeight - window.innerHeight > threshold;
    if (widthThreshold || heightThreshold) {
      if (!devtoolsOpen) {
        devtoolsOpen = true;
        console.warn("[Security] Developer tools detected");
      }
    } else {
      devtoolsOpen = false;
    }
  };
  setInterval(check, 2000);
}

export function generateCSRFToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export const secureSessionStore = {
  set(key: string, value: unknown, expiryMinutes: number = 60): void {
    const item = { value, expiry: Date.now() + expiryMinutes * 60 * 1000 };
    try {
      sessionStorage.setItem(`vta_${key}`, JSON.stringify(item));
    } catch {
      // noop
    }
  },
  get<T>(key: string): T | null {
    try {
      const raw = sessionStorage.getItem(`vta_${key}`);
      if (!raw) return null;
      const item = JSON.parse(raw);
      if (Date.now() > item.expiry) {
        sessionStorage.removeItem(`vta_${key}`);
        return null;
      }
      return item.value as T;
    } catch {
      return null;
    }
  },
  remove(key: string): void {
    try {
      sessionStorage.removeItem(`vta_${key}`);
    } catch {
      // noop
    }
  },
  clearAll(): void {
    try {
      const keys = Object.keys(sessionStorage).filter((k) => k.startsWith("vta_"));
      keys.forEach((k) => sessionStorage.removeItem(k));
    } catch {
      // noop
    }
  },
};

export function validateUserContent(content: string, maxLength: number = 10_000): { valid: boolean; reason?: string } {
  if (!content || typeof content !== "string") return { valid: false, reason: "Content must be a non-empty string" };
  if (content.length > maxLength) return { valid: false, reason: `Content exceeds maximum length of ${maxLength} characters` };
  const dangerousPatterns = [
    { pattern: /<script/gi, name: "script tags" },
    { pattern: /javascript:/gi, name: "javascript: URLs" },
    { pattern: /on\w+\s*=/gi, name: "event handlers" },
    { pattern: /<iframe/gi, name: "iframes" },
    { pattern: /data:text\/html/gi, name: "data URIs" },
  ];
  for (const { pattern, name } of dangerousPatterns) {
    if (pattern.test(content)) return { valid: false, reason: `Content contains disallowed ${name}` };
  }
  return { valid: true };
}

export function initialiseSecurity(): void {
  lockPrototypes();
  protectSensitiveText();
  if (import.meta.env.PROD) monitorDevtools();
  console.info("[Security] Voice to Action security layer initialised");
}
