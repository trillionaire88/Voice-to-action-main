/** Support inbox for user-facing email/SMS — single env-backed source for templates. */
export function supportContactEmail(): string {
  return (Deno.env.get("SUPPORT_EMAIL") ?? "support@voicetoaction.io").trim();
}
