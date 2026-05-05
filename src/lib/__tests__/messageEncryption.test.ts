import { describe, it, expect } from 'vitest';
import { encryptMessage, decryptMessage } from '../messageEncryption';

const SENDER = 'user-id-sender-abc';
const RECIPIENT = 'user-id-recipient-xyz';
const PLAINTEXT = 'Hello, this is a secret message!';

describe('encryptMessage', () => {
  it('returns an object with non-empty encrypted and iv fields', async () => {
    const result = await encryptMessage(PLAINTEXT, SENDER, RECIPIENT);
    expect(result).toHaveProperty('encrypted');
    expect(result).toHaveProperty('iv');
    expect(typeof result.encrypted).toBe('string');
    expect(typeof result.iv).toBe('string');
    expect(result.encrypted.length).toBeGreaterThan(0);
    expect(result.iv.length).toBeGreaterThan(0);
  });

  it('produces a different ciphertext on each call (random IV)', async () => {
    const r1 = await encryptMessage(PLAINTEXT, SENDER, RECIPIENT);
    const r2 = await encryptMessage(PLAINTEXT, SENDER, RECIPIENT);
    expect(r1.encrypted).not.toBe(r2.encrypted);
    expect(r1.iv).not.toBe(r2.iv);
  });
});

describe('decryptMessage', () => {
  it('round-trips: decrypting an encrypted message returns the original', async () => {
    const { encrypted, iv } = await encryptMessage(PLAINTEXT, SENDER, RECIPIENT);
    const decrypted = await decryptMessage(encrypted, iv, SENDER, RECIPIENT);
    expect(decrypted).toBe(PLAINTEXT);
  });

  it('key derivation is commutative (sender and recipient IDs can be swapped)', async () => {
    const { encrypted, iv } = await encryptMessage(PLAINTEXT, SENDER, RECIPIENT);
    const decrypted = await decryptMessage(encrypted, iv, RECIPIENT, SENDER);
    expect(decrypted).toBe(PLAINTEXT);
  });

  it('fails to decrypt with the wrong key pair', async () => {
    const { encrypted, iv } = await encryptMessage(PLAINTEXT, SENDER, RECIPIENT);
    await expect(
      decryptMessage(encrypted, iv, 'wrong-user-id', RECIPIENT),
    ).rejects.toThrow();
  });

  it('handles empty string messages', async () => {
    const { encrypted, iv } = await encryptMessage('', SENDER, RECIPIENT);
    const decrypted = await decryptMessage(encrypted, iv, SENDER, RECIPIENT);
    expect(decrypted).toBe('');
  });

  it('handles unicode and emoji in messages', async () => {
    const unicode = '🎉 Vote pour la démocratie! 투표 δημοκρατία';
    const { encrypted, iv } = await encryptMessage(unicode, SENDER, RECIPIENT);
    const decrypted = await decryptMessage(encrypted, iv, SENDER, RECIPIENT);
    expect(decrypted).toBe(unicode);
  });

  it('handles long messages', async () => {
    const long = 'a'.repeat(10_000);
    const { encrypted, iv } = await encryptMessage(long, SENDER, RECIPIENT);
    const decrypted = await decryptMessage(encrypted, iv, SENDER, RECIPIENT);
    expect(decrypted).toBe(long);
  });
});
