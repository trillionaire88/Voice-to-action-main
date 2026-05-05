import { createClient } from 'npm:@supabase/supabase-js@2.99.3';

function toSnakeCase(name: string) {
  return String(name)
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z0-9]+)/g, '$1_$2')
    .toLowerCase();
}

function tableFromEntityName(entityName: string) {
  const overrides: Record<string, string> = {
    Petition: 'petitions',
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
    User: 'profiles',
  };
  if (overrides[entityName]) return overrides[entityName];
  const snake = toSnakeCase(entityName);
  return snake.endsWith('s') ? snake : `${snake}s`;
}

function applyOrder(q: any, order?: string) {
  if (!order) return q;
  const str = String(order).trim();
  if (!str) return q;
  const descending = str.startsWith('-');
  const ascending = str.startsWith('+');
  const field = descending || ascending ? str.slice(1) : str;
  if (!field) return q;
  return q.order(field, { ascending: !descending });
}

function entityApi(tableName: string, client: any) {
  return {
    list: async (order?: string, limit?: number) => {
      let q = client.from(tableName).select('*');
      q = applyOrder(q, order);
      if (typeof limit === 'number') q = q.limit(limit);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    filter: async (filters: any = {}, order?: string, limit?: number) => {
      let q = client.from(tableName).select('*');
      if (filters && Object.keys(filters).length > 0) q = q.match(filters);
      q = applyOrder(q, order);
      if (typeof limit === 'number') q = q.limit(limit);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    get: async (id: string) => {
      const { data, error } = await client.from(tableName).select('*').eq('id', id).single();
      if (error) throw error;
      return data;
    },
    create: async (data: any) => {
      const { data: created, error } = await client.from(tableName).insert(data).select().single();
      if (error) throw error;
      return created;
    },
    update: async (id: string, data: any) => {
      const { data: updated, error } = await client.from(tableName).update(data).eq('id', id).select().single();
      if (error) throw error;
      return updated;
    },
    delete: async (id: string) => {
      const { error } = await client.from(tableName).delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    },
  };
}

const integrations = {
  Core: {
    async SendEmail(_payload: any) {
      return { success: true };
    },
    async InvokeLLM(payload: any) {
      const schema = payload?.response_json_schema?.properties;
      if (!schema) return {};
      const out: Record<string, any> = {};
      for (const [k, v] of Object.entries(schema)) {
        const type = (v as any)?.type;
        if (type === 'array') out[k] = [];
        else if (type === 'number') out[k] = 0;
        else if (type === 'object') out[k] = {};
        else out[k] = '';
      }
      return out;
    },
  },
};

export function createSupabaseContext(req: Request) {
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing Supabase env vars: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.');
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const entities = new Proxy(
    {},
    {
      get: (_target, prop) => entityApi(tableFromEntityName(String(prop)), supabase),
    },
  );
  const adminEntities = new Proxy(
    {},
    {
      get: (_target, prop) => entityApi(tableFromEntityName(String(prop)), supabaseAdmin),
    },
  );

  const getUser = async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error) return null;
    const authUser = data?.user ?? null;
    if (!authUser) return null;
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', authUser.id).single();
    if (!profile) return authUser;
    return { ...authUser, ...profile };
  };

  return { supabase, supabaseAdmin, entities, adminEntities, integrations, getUser };
}

