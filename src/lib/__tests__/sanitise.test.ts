import { describe, it, expect } from 'vitest';
import { sanitiseText, sanitiseUrl, truncate, escapeHtml } from '../sanitise';

describe('sanitiseText', () => {
  it('removes <script> tags', () => {
    expect(sanitiseText('<script>alert("xss")</script>Hello')).toBe('Hello');
  });

  it('removes javascript: URIs', () => {
    expect(sanitiseText('javascript:alert(1)')).toBe('alert(1)');
  });

  it('removes data:text/html URIs', () => {
    const result = sanitiseText('data:text/html,<h1>Hi</h1>');
    expect(result).not.toContain('data:text/html');
  });

  it('removes inline event handler attributes', () => {
    expect(sanitiseText('Hello onclick="bad()"')).toBe('Hello');
  });

  it('enforces maxLength', () => {
    expect(sanitiseText('a'.repeat(200), 100)).toHaveLength(100);
  });

  it('returns empty string for null input', () => {
    expect(sanitiseText(null as unknown as string)).toBe('');
  });

  it('returns empty string for undefined input', () => {
    expect(sanitiseText(undefined as unknown as string)).toBe('');
  });

  it('trims surrounding whitespace', () => {
    expect(sanitiseText('  hello  ')).toBe('hello');
  });

  it('preserves safe content unchanged', () => {
    expect(sanitiseText('Hello, world! This is safe content.')).toBe(
      'Hello, world! This is safe content.',
    );
  });

  it('removes multiline script tags', () => {
    const input = '<script\n type="text/javascript">evil()</script>safe';
    expect(sanitiseText(input)).toBe('safe');
  });
});

describe('sanitiseUrl', () => {
  it('allows http URLs', () => {
    expect(sanitiseUrl('http://example.com')).toBe('http://example.com/');
  });

  it('allows https URLs', () => {
    expect(sanitiseUrl('https://example.com/path')).toBe(
      'https://example.com/path',
    );
  });

  it('rejects javascript: URLs', () => {
    expect(sanitiseUrl('javascript:alert(1)')).toBe('');
  });

  it('rejects data: URLs', () => {
    expect(sanitiseUrl('data:text/html,<h1>Hi</h1>')).toBe('');
  });

  it('rejects ftp: URLs', () => {
    expect(sanitiseUrl('ftp://example.com')).toBe('');
  });

  it('rejects invalid URLs', () => {
    expect(sanitiseUrl('not-a-url')).toBe('');
  });

  it('returns empty string for empty input', () => {
    expect(sanitiseUrl('')).toBe('');
  });

  it('preserves query strings', () => {
    expect(sanitiseUrl('https://example.com/path?q=1&page=2')).toBe(
      'https://example.com/path?q=1&page=2',
    );
  });
});

describe('truncate', () => {
  it('truncates long text with an ellipsis character', () => {
    expect(truncate('Hello world', 5)).toBe('Hello…');
  });

  it('returns the original text when within the limit', () => {
    expect(truncate('Hi', 5)).toBe('Hi');
  });

  it('handles text exactly at the limit', () => {
    expect(truncate('Hello', 5)).toBe('Hello');
  });

  it('returns empty string for empty input', () => {
    expect(truncate('', 10)).toBe('');
  });

  it('returns empty string for null input', () => {
    expect(truncate(null as unknown as string, 10)).toBe('');
  });
});

describe('escapeHtml', () => {
  it('escapes ampersands', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b');
  });

  it('escapes less-than and greater-than signs', () => {
    expect(escapeHtml('<b>bold</b>')).toBe('&lt;b&gt;bold&lt;/b&gt;');
  });

  it('escapes double quotes', () => {
    expect(escapeHtml('"quoted"')).toBe('&quot;quoted&quot;');
  });

  it('escapes single quotes', () => {
    expect(escapeHtml("it's")).toBe("it&#039;s");
  });

  it('leaves plain text unchanged', () => {
    expect(escapeHtml('Hello world 123')).toBe('Hello world 123');
  });

  it('escapes multiple special chars in one string', () => {
    expect(escapeHtml('<div class="x">a & b</div>')).toBe(
      '&lt;div class=&quot;x&quot;&gt;a &amp; b&lt;/div&gt;',
    );
  });
});
