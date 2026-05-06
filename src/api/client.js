// @ts-nocheck — this file is excluded from the tsconfig project; type-checking
// via transitive imports is suppressed here to avoid false positives from the
// placeholder-client union type.
import { supabase } from '@/lib/supabase';
import { cleanForDB } from '@/lib/dbHelpers';

// Compatibility layer over @supabase/supabase-js so the app can keep using
// `api.entities.*` / `api.auth.*` patterns against Postgres via Supabase.

const ENTITY_TABLE_OVERRIDES = {
  Petition: 'petitions',
  PetitionSignature: 'signatures',
  Poll: 'polls',
  Signature: 'signatures',
  Vote: 'votes',
  Community: 'communities',
  CommunityMember: 'community_members',
  Scorecard: 'scorecards',
  Notification: 'notifications',
  ComplianceLog: 'compliance_logs',
  ApiKey: 'api_keys',
  Profile: 'profiles',
  // Some code uses `User` as the profile entity.
  User: 'profiles',
};

function toSnakeCase(name) {
  return String(name)
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z0-9]+)/g, '$1_$2')
    .toLowerCase();
}

function entityNameToTable(entityName) {
  if (ENTITY_TABLE_OVERRIDES[entityName]) return ENTITY_TABLE_OVERRIDES[entityName];
  const snake = toSnakeCase(entityName);
  // Naive pluralization matches the current schema patterns in this repo.
  return snake.endsWith('s') ? snake : `${snake}s`;
}

function applyOrder(query, order) {
  if (!order) return query;
  const str = String(order).trim();
  if (!str) return query;
  const descending = str.startsWith('-');
  const field = descending || str.startsWith('+') ? str.slice(1) : str;
  if (!field) return query;
  return query.order(field, { ascending: !descending });
}

function createEntityApi(tableName) {
  return {
    list: async (order, limit) => {
      let q = supabase.from(tableName).select('*');
      q = applyOrder(q, order);
      if (typeof limit === 'number') q = q.limit(limit);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    filter: async (filters = {}, order, limit) => {
      let q = supabase.from(tableName).select('*');
      if (filters && Object.keys(filters).length > 0) q = q.match(filters);
      q = applyOrder(q, order);
      if (typeof limit === 'number') q = q.limit(limit);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    get: async (id) => {
      const { data, error } = await supabase.from(tableName).select('*').eq('id', id).single();
      if (error) throw error;
      return data;
    },
    create: async (data) => {
      const { data: created, error } = await supabase
        .from(tableName)
        .insert(cleanForDB(data ?? {}))
        .select()
        .single();
      if (error) throw error;
      return created;
    },
    update: async (id, data) => {
      const { data: updated, error } = await supabase
        .from(tableName)
        .update(cleanForDB(data ?? {}))
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return updated;
    },
    delete: async (id) => {
      const { error } = await supabase.from(tableName).delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    },
    subscribe: (callback, event = '*') => {
      const channelName = `rt:${tableName}:${Math.random().toString(36).slice(2)}`;
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          { event, schema: 'public', table: tableName },
          (payload) => callback?.(payload)
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    },
  };
}

export const api = {
  entities: new Proxy(
    {},
    {
      get: (_target, prop) => {
        const name = String(prop);
        const table = entityNameToTable(name);
        return createEntityApi(table);
      },
    }
  ),

  integrations: {
    Core: {
      // Upload a file to Supabase Storage; returns { file_url }.
      UploadFile: async ({ file }) => {
        if (!file) throw new Error('No file provided');

        const MAX_BYTES = 10 * 1024 * 1024;
        if (file.size > MAX_BYTES) {
          throw new Error('File is too large (maximum 10 MB).');
        }

        const name = (file.name || 'file').toLowerCase();
        const mime = (file.type || '').toLowerCase();

        const extOk = (suffix) => name.endsWith(suffix);
        const isImage = mime.startsWith('image/');
        const isPdf = mime === 'application/pdf' || extOk('.pdf');
        const isText = mime === 'text/plain' || extOk('.txt');
        const isDocx =
          mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
          extOk('.docx');
        const isXlsx =
          mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
          extOk('.xlsx');

        if (!isImage && !isPdf && !isText && !isDocx && !isXlsx) {
          throw new Error(
            'Unsupported file type. Allowed: images, PDF, plain text, .docx, or .xlsx.',
          );
        }

        const folder = isImage ? 'images' : 'documents';
        const ext =
          (file.name || 'file').split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') ||
          (isPdf ? 'pdf' : isDocx ? 'docx' : isXlsx ? 'xlsx' : 'bin');
        const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from('media').upload(path, file, { upsert: false });
        if (error) throw error;
        const { data } = supabase.storage.from('media').getPublicUrl(path);
        return { file_url: data.publicUrl };
      },

      // Send transactional email via send-email-app (auth + recipient rules); send-email itself is service-role only.
      SendEmail: async ({ to, subject, body, html }) => {
        const { data, error } = await supabase.functions.invoke('send-email-app', {
          body: { to, subject, body, html },
        });
        if (error) throw error;
        return data ?? { success: true };
      },

      // Send an SMS via the send-sms Supabase Edge Function.
      SendSMS: async ({ to, message }) => {
        const { data, error } = await supabase.functions.invoke('send-sms', {
          body: { to, message },
        });
        if (error) throw error;
        return data ?? { success: true };
      },

      // Invoke an LLM via the invoke-llm Supabase Edge Function.
      InvokeLLM: async ({ prompt, response_json_schema, input_data, add_context_from_internet } = {}) => {
        const { data, error } = await supabase.functions.invoke('invoke-llm', {
          body: { prompt, response_json_schema, input_data, add_context_from_internet },
        });
        if (error) throw error;
        return data ?? {};
      },

      // Generate an image via the generate-image Supabase Edge Function.
      GenerateImage: async ({ prompt, width, height } = {}) => {
        const { data, error } = await supabase.functions.invoke('generate-image', {
          body: { prompt, width, height },
        });
        if (error) throw error;
        return data ?? { image_url: null };
      },

      // Extract structured data from an uploaded file.
      ExtractDataFromUploadedFile: async ({ file_url, json_schema } = {}) => {
        const { data, error } = await supabase.functions.invoke('extract-data', {
          body: { file_url, json_schema },
        });
        if (error) throw error;
        return data ?? {};
      },
    },
  },

  auth: {
    me: async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      const authUser = data?.user ?? null;
      if (!authUser) return null;

      // Merge profile row into the auth user so the existing UI keeps working.
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (profileError || !profile) return authUser;
      return { ...authUser, ...profile };
    },
    logout: async () => supabase.auth.signOut(),
    redirectToLogin: async (returnPath) => {
      const ret =
        typeof returnPath === 'string' && returnPath.startsWith('http')
          ? returnPath
          : `${window.location.origin}${typeof returnPath === 'string' ? returnPath : '/'}`;
      window.location.assign(
        `${window.location.origin}/?signin=1&return=${encodeURIComponent(ret)}`,
      );
    },
    updateMe: async (patch) => {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      const authUser = data?.user ?? null;
      if (!authUser) return null;

      // Update the profile row. If the column doesn't exist, ignore so the app keeps running.
      const { data: updated, error: updateError } = await supabase
        .from('profiles')
        .update(cleanForDB(patch ?? {}))
        .eq('id', authUser.id)
        .select('*')
        .single();

      if (updateError) throw updateError;
      return updated;
    },
  },
  functions: {
    invoke: async (functionName, payload = {}) => {
      // Supabase edge function invocation helper.
      // Keep the return shape compatible with existing callers (`res.data.*`).
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: payload,
      });
      if (error) throw error;
      return { data };
    },
  },
};
