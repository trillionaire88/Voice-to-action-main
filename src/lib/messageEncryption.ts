const enc = new TextEncoder();
const dec = new TextDecoder();

function orderedPair(a: string, b: string): string {
  return [a, b].sort().join(":");
}

async function deriveKey(senderId: string, recipientId: string): Promise<CryptoKey> {
  const salt = enc.encode("voicetoaction-msg-salt");
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(orderedPair(senderId, recipientId)),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptMessage(
  content: string,
  senderId: string,
  recipientId: string,
): Promise<{ encrypted: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(senderId, recipientId);
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(content));
  return {
    encrypted: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    iv: btoa(String.fromCharCode(...iv)),
  };
}

export async function decryptMessage(
  encrypted: string,
  iv: string,
  senderId: string,
  recipientId: string,
): Promise<string> {
  const key = await deriveKey(senderId, recipientId);
  const ivBytes = Uint8Array.from(atob(iv), (c) => c.charCodeAt(0));
  const encryptedBytes = Uint8Array.from(atob(encrypted), (c) => c.charCodeAt(0));
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: ivBytes }, key, encryptedBytes);
  return dec.decode(plain);
}
