import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async () => {
  const supabase = createClient(Deno.env.get("SUPABASE_URL") || "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "");
  const [{ count: users }, { count: petitions }, { count: signatures }, { count: communities }] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("petitions").select("*", { count: "exact", head: true }),
    supabase.from("signatures").select("*", { count: "exact", head: true }),
    supabase.from("communities").select("*", { count: "exact", head: true }),
  ]);
  return new Response(JSON.stringify({
    summary: { users: users || 0, petitions: petitions || 0, signatures: signatures || 0, communities: communities || 0 },
    email_to: "jeremywhisson@gmail.com",
  }), { headers: { "content-type": "application/json" } });
});
