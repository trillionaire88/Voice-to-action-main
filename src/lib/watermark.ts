import { supabase } from "@/lib/supabase";
import { cleanForDB } from "@/lib/dbHelpers";

export async function generateWatermark(contentId: string, creatorId: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`VOICETOACTION|${contentId}|${creatorId}|${Date.now()}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Non-blocking forensic watermark row (Layer 3). */
export async function insertContentWatermark(
  contentType: string,
  contentId: string,
  creatorId: string,
): Promise<void> {
  const watermark_hash = await generateWatermark(contentId, creatorId);
  const { error } = await supabase.from("content_watermarks").insert(cleanForDB({
    content_type: contentType,
    content_id: contentId,
    creator_id: creatorId,
    watermark_hash,
    platform: "voicetoaction.io",
  }));
  if (error) console.warn("[watermark]", contentType, error.message);
}
