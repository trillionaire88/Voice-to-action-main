import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const fallback = [
  { name: "Department of the Prime Minister and Cabinet", email: "info@pmc.gov.au" },
  { name: "Department of Home Affairs", email: "enquiries@homeaffairs.gov.au" },
  { name: "Department of Health and Aged Care", email: "health@health.gov.au" },
];

serve(async () => {
  try {
    const res = await fetch("https://www.aph.gov.au/api");
    if (!res.ok) throw new Error("API unavailable");
    const text = await res.text();
    return new Response(JSON.stringify({ source: "aph", data: text.slice(0, 1000) }), { headers: { "content-type": "application/json" } });
  } catch {
    return new Response(JSON.stringify({ source: "fallback", departments: fallback }), { headers: { "content-type": "application/json" } });
  }
});
