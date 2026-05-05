import { describe, it, expect, vi } from 'vitest';
import { cleanForDB, safeInsert, safeUpdate } from '../dbHelpers';

// ─── Supabase client mock factory ────────────────────────────────────────────

function makeInsertClient(result: { data: unknown; error: unknown }) {
  const singleFn = vi.fn().mockResolvedValue(result);
  const selectFn = vi.fn().mockReturnValue({ single: singleFn });
  const insertFn = vi.fn().mockReturnValue({ select: selectFn });
  const fromFn = vi.fn().mockReturnValue({ insert: insertFn });
  return { client: { from: fromFn }, fromFn, insertFn, selectFn, singleFn };
}

function makeUpdateClient(result: { data: unknown; error: unknown }) {
  const singleFn = vi.fn().mockResolvedValue(result);
  const selectFn = vi.fn().mockReturnValue({ single: singleFn });
  const eqFn = vi.fn().mockReturnValue({ select: selectFn });
  const updateFn = vi.fn().mockReturnValue({ eq: eqFn });
  const fromFn = vi.fn().mockReturnValue({ update: updateFn });
  return { client: { from: fromFn }, fromFn, updateFn, eqFn, selectFn, singleFn };
}

// ─── cleanForDB ───────────────────────────────────────────────────────────────

describe('cleanForDB', () => {
  it('removes null values', () => {
    expect(cleanForDB({ a: 1, b: null })).toEqual({ a: 1 });
  });

  it('removes undefined values', () => {
    expect(cleanForDB({ a: 1, b: undefined })).toEqual({ a: 1 });
  });

  it('removes empty strings', () => {
    expect(cleanForDB({ a: '', b: 'value' })).toEqual({ b: 'value' });
  });

  it('keeps the number zero', () => {
    expect(cleanForDB({ a: 0, b: null })).toEqual({ a: 0 });
  });

  it('keeps the boolean false', () => {
    expect(cleanForDB({ a: false, b: null })).toEqual({ a: false });
  });

  it('keeps nested objects', () => {
    const nested = { x: 1 };
    expect(cleanForDB({ a: nested })).toEqual({ a: nested });
  });

  it('returns an empty object when all values are stripped', () => {
    expect(cleanForDB({ a: null, b: undefined, c: '' })).toEqual({});
  });
});

// ─── safeInsert ───────────────────────────────────────────────────────────────

describe('safeInsert', () => {
  it('strips null fields before calling supabase', async () => {
    const { client, fromFn, insertFn } = makeInsertClient({
      data: { id: '1' },
      error: null,
    });

    await safeInsert(
      client as unknown as Parameters<typeof safeInsert>[0],
      'posts',
      { title: 'Hello', deleted: null },
    );

    expect(fromFn).toHaveBeenCalledWith('posts');
    expect(insertFn).toHaveBeenCalledWith({ title: 'Hello' });
  });

  it('returns the result from supabase on success', async () => {
    const expected = { data: { id: '1' }, error: null };
    const { client } = makeInsertClient(expected);

    const result = await safeInsert(
      client as unknown as Parameters<typeof safeInsert>[0],
      'posts',
      { title: 'Hello' },
    );

    expect(result).toEqual(expected);
  });

  it('returns { data: null, error: Error } when supabase throws', async () => {
    const fromFn = vi.fn().mockImplementation(() => {
      throw new Error('DB error');
    });
    const mockClient = { from: fromFn };

    const result = await safeInsert(
      mockClient as unknown as Parameters<typeof safeInsert>[0],
      'posts',
      { title: 'Hello' },
    );

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
  });
});

// ─── safeUpdate ───────────────────────────────────────────────────────────────

describe('safeUpdate', () => {
  it('strips null fields and calls eq with the provided id', async () => {
    const { client, fromFn, updateFn, eqFn } = makeUpdateClient({
      data: { id: '1' },
      error: null,
    });

    await safeUpdate(
      client as unknown as Parameters<typeof safeUpdate>[0],
      'posts',
      'abc-123',
      { title: 'New', draft: undefined },
    );

    expect(fromFn).toHaveBeenCalledWith('posts');
    expect(updateFn).toHaveBeenCalledWith({ title: 'New' });
    expect(eqFn).toHaveBeenCalledWith('id', 'abc-123');
  });

  it('returns the result from supabase on success', async () => {
    const expected = { data: { id: '1' }, error: null };
    const { client } = makeUpdateClient(expected);

    const result = await safeUpdate(
      client as unknown as Parameters<typeof safeUpdate>[0],
      'posts',
      '1',
      { title: 'New' },
    );

    expect(result).toEqual(expected);
  });

  it('returns { data: null, error: Error } when supabase throws', async () => {
    const fromFn = vi.fn().mockImplementation(() => {
      throw new Error('DB error');
    });
    const mockClient = { from: fromFn };

    const result = await safeUpdate(
      mockClient as unknown as Parameters<typeof safeUpdate>[0],
      'posts',
      '1',
      { title: 'New' },
    );

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
  });
});
