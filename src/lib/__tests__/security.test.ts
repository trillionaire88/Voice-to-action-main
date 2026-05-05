import { describe, it, expect, beforeEach } from 'vitest';
import {
  sanitiseUserInput,
  generateCSRFToken,
  validateUserContent,
  secureSessionStore,
  generateSessionFingerprint,
  lockPrototypes,
} from '../security';

describe('sanitiseUserInput', () => {
  it('removes <script> tags', () => {
    expect(sanitiseUserInput('<script>alert("x")</script>safe')).toBe('safe');
  });

  it('removes javascript: URIs', () => {
    expect(sanitiseUserInput('javascript:evil()')).toBe('evil()');
  });

  it('removes data:text/html URIs', () => {
    const result = sanitiseUserInput('data:text/html,payload');
    expect(result).not.toContain('data:text/html');
  });

  it('strips event handler attribute names and = signs', () => {
    const result = sanitiseUserInput('hello onclick=bad()');
    expect(result).not.toMatch(/onclick\s*=/i);
  });

  it('removes <iframe> tags', () => {
    const result = sanitiseUserInput('<iframe src="evil.com"></iframe>');
    expect(result).not.toContain('<iframe');
  });

  it('trims the result', () => {
    expect(sanitiseUserInput('  hello  ')).toBe('hello');
  });

  it('leaves safe text unchanged', () => {
    expect(sanitiseUserInput('Just a normal sentence.')).toBe(
      'Just a normal sentence.',
    );
  });
});

describe('generateCSRFToken', () => {
  it('returns a 64-character hexadecimal string', () => {
    const token = generateCSRFToken();
    expect(token).toHaveLength(64);
    expect(/^[0-9a-f]{64}$/.test(token)).toBe(true);
  });

  it('generates a unique token on each call', () => {
    const t1 = generateCSRFToken();
    const t2 = generateCSRFToken();
    expect(t1).not.toBe(t2);
  });
});

describe('validateUserContent', () => {
  it('returns valid for safe content', () => {
    expect(validateUserContent('Hello, world!')).toEqual({ valid: true });
  });

  it('rejects an empty string', () => {
    const result = validateUserContent('');
    expect(result.valid).toBe(false);
    expect(result.reason).toBeDefined();
  });

  it('rejects null input', () => {
    const result = validateUserContent(null as unknown as string);
    expect(result.valid).toBe(false);
  });

  it('rejects content exceeding the default max length', () => {
    const result = validateUserContent('a'.repeat(10_001));
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/exceeds maximum length/i);
  });

  it('rejects content exceeding a custom max length', () => {
    const result = validateUserContent('a'.repeat(101), 100);
    expect(result.valid).toBe(false);
  });

  it('rejects script tags', () => {
    const result = validateUserContent('<script>alert(1)</script>');
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/script tags/i);
  });

  it('rejects javascript: URLs', () => {
    expect(validateUserContent('javascript:alert(1)').valid).toBe(false);
  });

  it('rejects event handler attributes', () => {
    expect(validateUserContent('click onclick=bad()').valid).toBe(false);
  });

  it('rejects iframes', () => {
    expect(validateUserContent('<iframe src="evil.com">').valid).toBe(false);
  });

  it('rejects data:text/html URIs', () => {
    expect(validateUserContent('data:text/html,payload').valid).toBe(false);
  });
});

describe('secureSessionStore', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('stores and retrieves a plain value', () => {
    secureSessionStore.set('key1', 'hello', 60);
    expect(secureSessionStore.get('key1')).toBe('hello');
  });

  it('stores and retrieves an object value', () => {
    const obj = { id: 1, name: 'Alice' };
    secureSessionStore.set('obj', obj, 60);
    expect(secureSessionStore.get('obj')).toEqual(obj);
  });

  it('returns null for a key that was never set', () => {
    expect(secureSessionStore.get('nonExistent')).toBeNull();
  });

  it('removes a specific key', () => {
    secureSessionStore.set('toRemove', 'value', 60);
    secureSessionStore.remove('toRemove');
    expect(secureSessionStore.get('toRemove')).toBeNull();
  });

  it('clearAll removes all vta_-prefixed keys', () => {
    secureSessionStore.set('k1', 'v1', 60);
    secureSessionStore.set('k2', 'v2', 60);
    secureSessionStore.clearAll();
    expect(secureSessionStore.get('k1')).toBeNull();
    expect(secureSessionStore.get('k2')).toBeNull();
  });

  it('clearAll does not remove non-vta_ keys', () => {
    sessionStorage.setItem('external_key', 'should-survive');
    secureSessionStore.clearAll();
    expect(sessionStorage.getItem('external_key')).toBe('should-survive');
  });

  it('returns null and cleans up an expired entry', () => {
    const expired = { value: 'old', expiry: Date.now() - 1000 };
    sessionStorage.setItem('vta_expired', JSON.stringify(expired));
    expect(secureSessionStore.get('expired')).toBeNull();
    expect(sessionStorage.getItem('vta_expired')).toBeNull();
  });
});

describe('generateSessionFingerprint', () => {
  it('returns a non-empty string', () => {
    const fp = generateSessionFingerprint();
    expect(typeof fp).toBe('string');
    expect(fp.length).toBeGreaterThan(0);
  });

  it('returns a string no longer than 64 characters', () => {
    expect(generateSessionFingerprint().length).toBeLessThanOrEqual(64);
  });

  it('returns the same value on repeated calls in the same environment', () => {
    expect(generateSessionFingerprint()).toBe(generateSessionFingerprint());
  });
});

describe('lockPrototypes', () => {
  it('executes without throwing', () => {
    expect(() => lockPrototypes()).not.toThrow();
  });
});
