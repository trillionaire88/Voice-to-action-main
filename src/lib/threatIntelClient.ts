const base = () => import.meta.env.VITE_SUPABASE_URL;
const anon = () => import.meta.env.VITE_SUPABASE_ANON_KEY;

function headers(): Record<string, string> {
  return {
    Authorization: `Bearer ${anon()}`,
    "Content-Type": "application/json",
  };
}

/** Report honeypot trigger to edge function (non-blocking). */
export function reportHoneypotHit(endpoint: string): void {
  const url = base();
  const key = anon();
  if (!url || !key) return;
  fetch(`${url}/functions/v1/threat-intelligence`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ action: "honeypot_hit", ip_address: null, endpoint }),
  }).catch(() => {});
}

/** IP reputation check; returns false if blocked. */
export async function checkIPReputation(): Promise<boolean> {
  const url = base();
  const key = anon();
  if (!url || !key) return true;
  try {
    const res = await fetch(`${url}/functions/v1/threat-intelligence`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ action: "check_ip", ip_address: null }),
    });
    const data = await res.json().catch(() => ({}));
    if (data && data.allowed === false) return false;
    return true;
  } catch {
    return true;
  }
}
