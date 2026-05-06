import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Missing Supabase environment variables (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY). ' +
    'Backend features will be unavailable. Enable Lovable Cloud to set these up automatically.'
  );
}

// Create a real client when credentials exist, otherwise a placeholder that won't crash the app.
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        storageKey: 'vta-auth-token',
        // Use the canonical app URL from env, fall back to current origin (Capacitor uses capacitor:// or app host)
        redirectTo: import.meta.env.VITE_APP_URL
          ? `${import.meta.env.VITE_APP_URL}/`
          : `${window.location.origin}/`,
      },
    })
  : createPlaceholderClient();

function createPlaceholderClient() {
  const noopResult = { data: null, error: { message: 'Supabase not configured' } };
  const noop = () => Promise.resolve(noopResult);

  // Read-only query builder stub — chainable filter/modifier methods.
  // Terminal calls (.single, .maybeSingle) resolve to the noop result.
  const noopSelect = () => ({
    select: noopSelect, eq: noopSelect, neq: noopSelect, gt: noopSelect, lt: noopSelect,
    gte: noopSelect, lte: noopSelect, like: noopSelect, ilike: noopSelect, is: noopSelect,
    not: noopSelect, or: noopSelect, and: noopSelect, filter: noopSelect, match: noopSelect,
    in: noopSelect, order: noopSelect, limit: noopSelect, range: noopSelect,
    single: noop,
    maybeSingle: noop,
  });

  // Mutation stub — returns a real Promise (so bare `await .insert()` works) that also
  // exposes query builder methods (so `.insert(...).select().single()` chains work).
  function noopMutation() {
    const p = Promise.resolve(noopResult);
    return Object.assign(p, {
      select: noopSelect,
      eq: noopMutation, neq: noopMutation, gt: noopMutation, lt: noopMutation,
      gte: noopMutation, lte: noopMutation, match: noopMutation,
      single: noop, maybeSingle: noop,
    });
  }

  const noopAuth = {
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    refreshSession: () => Promise.resolve({ data: { session: null }, error: null }),
    onAuthStateChange: (_cb) => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signOut: () => Promise.resolve({ error: null }),
    signInWithOAuth: () => Promise.resolve({ data: null, error: null }),
    signInWithPassword: () => Promise.resolve({ data: null, error: { message: 'Not configured' } }),
    updateUser: () => Promise.resolve({ data: null, error: null }),
  };
  const noopChannel = {
    on: (_event, _opts, _cb) => noopChannel,
    subscribe: (_cb) => noopChannel,
    unsubscribe: () => Promise.resolve(),
  };
  return {
    from: () => ({
      select: noopSelect,
      insert: noopMutation,
      update: noopMutation,
      delete: noopMutation,
      upsert: noopMutation,
    }),
    auth: noopAuth,
    storage: { from: () => ({ upload: noop, getPublicUrl: () => ({ data: { publicUrl: '' } }) }) },
    functions: { invoke: noop },
    rpc: noop,
    channel: (_name) => noopChannel,
    removeChannel: (_channel) => Promise.resolve(),
  };
}

export default supabase;
