import { describe, it, expect } from 'vitest';
import {
  isValidEmail,
  isValidUUID,
  isValidLength,
  isValidUrl,
  sanitiseHtml,
  isValidAustralianPhone,
} from '../validation';

describe('isValidEmail', () => {
  it('accepts a standard valid email', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
  });

  it('accepts emails with + tags', () => {
    expect(isValidEmail('name+tag@domain.co.uk')).toBe(true);
  });

  it('accepts subdomains', () => {
    expect(isValidEmail('user@mail.example.com')).toBe(true);
  });

  it('rejects a string without @', () => {
    expect(isValidEmail('not-an-email')).toBe(false);
  });

  it('rejects a string with no local part', () => {
    expect(isValidEmail('@domain.com')).toBe(false);
  });

  it('rejects a string with no domain', () => {
    expect(isValidEmail('user@')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(isValidEmail('')).toBe(false);
  });
});

describe('isValidUUID', () => {
  it('accepts a v4 UUID', () => {
    expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });

  it('accepts a v1 UUID', () => {
    expect(isValidUUID('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(true);
  });

  it('accepts uppercase UUIDs', () => {
    expect(isValidUUID('550E8400-E29B-41D4-A716-446655440000')).toBe(true);
  });

  it('rejects an arbitrary string', () => {
    expect(isValidUUID('not-a-uuid')).toBe(false);
  });

  it('rejects a truncated UUID', () => {
    expect(isValidUUID('550e8400-e29b-41d4-a716')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(isValidUUID('')).toBe(false);
  });
});

describe('isValidLength', () => {
  it('accepts a string within the inclusive range', () => {
    expect(isValidLength('hello', 1, 10)).toBe(true);
  });

  it('accepts a string exactly at the minimum', () => {
    expect(isValidLength('hi', 2, 10)).toBe(true);
  });

  it('accepts a string exactly at the maximum', () => {
    expect(isValidLength('hello', 5, 5)).toBe(true);
  });

  it('rejects an empty string when min is 1', () => {
    expect(isValidLength('', 1, 10)).toBe(false);
  });

  it('rejects a string exceeding the maximum', () => {
    expect(isValidLength('hello world', 1, 5)).toBe(false);
  });
});

describe('isValidUrl', () => {
  it('accepts an https URL', () => {
    expect(isValidUrl('https://example.com')).toBe(true);
  });

  it('accepts an http URL with path and query string', () => {
    expect(isValidUrl('http://example.com/path?q=1')).toBe(true);
  });

  it('rejects ftp: protocol', () => {
    expect(isValidUrl('ftp://example.com')).toBe(false);
  });

  it('rejects javascript: protocol', () => {
    expect(isValidUrl('javascript:alert(1)')).toBe(false);
  });

  it('rejects a plain string', () => {
    expect(isValidUrl('not-a-url')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(isValidUrl('')).toBe(false);
  });
});

describe('sanitiseHtml', () => {
  it('encodes all five HTML special characters', () => {
    expect(sanitiseHtml('<div class="x">hello & world\'s</div>')).toBe(
      '&lt;div class=&quot;x&quot;&gt;hello &amp; world&#x27;s&lt;/div&gt;',
    );
  });

  it('leaves plain text unchanged', () => {
    expect(sanitiseHtml('Plain text with no special chars')).toBe(
      'Plain text with no special chars',
    );
  });
});

describe('isValidAustralianPhone', () => {
  it('accepts a 10-digit number starting with 04', () => {
    expect(isValidAustralianPhone('0412345678')).toBe(true);
  });

  it('accepts the +61 international prefix', () => {
    expect(isValidAustralianPhone('+61412345678')).toBe(true);
  });

  it('accepts numbers with spaces', () => {
    expect(isValidAustralianPhone('04 1234 5678')).toBe(true);
  });

  it('rejects numbers without the AU prefix', () => {
    expect(isValidAustralianPhone('1234567890')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(isValidAustralianPhone('')).toBe(false);
  });
});
