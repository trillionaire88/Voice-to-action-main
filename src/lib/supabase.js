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
        redirectTo: `${window.location.origin}/`,
      },
    })
  : createPlaceholderClient();

function createPlaceholderClient() {
  const noop = () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } });
  const noopSelect = () => ({ select: noopSelect, eq: noopSelect, single: noop, insert: noop, update: noop, delete: noop, order: noopSelect, limit: noopSelect, match: noopSelect, in: noopSelect, neq: noopSelect, gt: noopSelect, lt: noopSelect, gte: noopSelect, lte: noopSelect, like: noopSelect, ilike: noopSelect, is: noopSelect, not: noopSelect, or: noopSelect, filter: noopSelect, range: noopSelect, then: noop.then });
  const noopAuth = {
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    onAuthStateChange: (_cb) => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signOut: () => Promise.resolve(),
    signInWithOAuth: () => Promise.resolve(),
    signInWithPassword: () => Promise.resolve({ data: null, error: { message: 'Not configured' } }),
  };
  return {
    from: () => ({ select: noopSelect, insert: noop, update: noop, delete: noop, upsert: noop }),
    auth: noopAuth,
    storage: { from: () => ({ upload: noop, getPublicUrl: () => ({ data: { publicUrl: '' } }) }) },
    functions: { invoke: noop },
    rpc: noop,
  };
}

export default supabase;
