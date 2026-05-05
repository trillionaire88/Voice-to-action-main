/**
 * Poll images must be hosted under this project's Supabase URL (e.g. storage).
 * Keeps client validation aligned with DB constraint supabase/polls_image_url_constraint.sql.
 */
export function assertPollImageUrlFromProject(imageUrl, viteSupabaseUrl) {
  if (imageUrl == null || imageUrl === "") return;
  const base = String(viteSupabaseUrl || "").replace(/\/$/, "");
  const url = String(imageUrl);
  if (!base || !url.startsWith(base)) {
    throw new Error("Poll images must be uploaded to this project's storage.");
  }
}
