export async function checkPasswordBreach(
  password: string,
): Promise<{ breached: boolean; count: number }> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-1", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();

    const prefix = hashHex.slice(0, 5);
    const suffix = hashHex.slice(5);

    const baseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!baseUrl) return { breached: false, count: 0 };

    const response = await fetch(
      `${baseUrl}/functions/v1/check-password-breach`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passwordHash: prefix, suffix }),
      },
    );

    if (!response.ok) return { breached: false, count: 0 };

    const result = await response.json().catch(() => null);
    if (!result || typeof result.breached !== "boolean") {
      return { breached: false, count: 0 };
    }
    return result as { breached: boolean; count: number };
  } catch {
    // Network failure or edge function unavailable — fail open (don't block the user)
    return { breached: false, count: 0 };
  }
}
