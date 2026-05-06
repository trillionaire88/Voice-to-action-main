/** Resend "from" headers — mailbox hosts come from env (never hardcode in function bodies). */
export const FROM_SECURITY =
  `Voice to Action Security <${Deno.env.get("EMAIL_FROM_SECURITY") ?? "noreply@voicetoaction.io"}>`;

export const FROM_NOREPLY =
  `Voice to Action <${Deno.env.get("EMAIL_FROM_NOREPLY") ?? "noreply@voicetoaction.io"}>`;
