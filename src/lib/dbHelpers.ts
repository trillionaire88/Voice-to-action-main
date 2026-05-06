/**
 * Remove undefined and null values from an object before sending to Supabase.
 * Empty strings are stripped so optional fields are omitted when unset.
 */
export function cleanForDB(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== "")
  );
}

/**
 * Safe Supabase insert — strips nulls and catches errors gracefully.
 */
export async function safeInsert(
  supabase: { from: (t: string) => { insert: (d: Record<string, unknown>) => { select: () => { single: () => Promise<{ data: unknown; error: unknown }> } } } },
  table: string,
  data: Record<string, unknown>
): Promise<{ data: unknown; error: unknown }> {
  try {
    const clean = cleanForDB(data);
    const result = await supabase.from(table).insert(clean).select().single();
    return result;
  } catch (error) {
    return { data: null, error };
  }
}

/**
 * Safe Supabase update — strips nulls and catches errors gracefully.
 */
export async function safeUpdate(
  supabase: {
    from: (t: string) => {
      update: (d: Record<string, unknown>) => { eq: (c: string, id: string) => { select: () => { single: () => Promise<{ data: unknown; error: unknown }> } } };
    };
  },
  table: string,
  id: string,
  data: Record<string, unknown>
): Promise<{ data: unknown; error: unknown }> {
  try {
    const clean = cleanForDB(data);
    const result = await supabase.from(table).update(clean).eq("id", id).select().single();
    return result;
  } catch (error) {
    return { data: null, error };
  }
}
