/**
 * Use before inserting/updating polls.image_url from Edge Functions.
 * Matches client checks against VITE_SUPABASE_URL (same origin as SUPABASE_URL).
 */
export function assertPollImageUrlForPolls(imageUrl: string | null | undefined): void {
  if (imageUrl == null || imageUrl === "") return;
  const base = (Deno.env.get("SUPABASE_URL") || "").replace(/\/$/, "");
  if (!base || !imageUrl.startsWith(base)) {
    throw new Error("Poll image_url must use this project's Supabase storage URL.");
  }
}
