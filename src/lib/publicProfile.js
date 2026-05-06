import { supabase } from "@/lib/supabase";

/** Public-safe profile row (see public.public_profiles_view). */
export async function fetchPublicProfileById(id) {
  if (!id) return null;
  const { data, error } = await supabase.from("public_profiles_view").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}
