import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { siteUrl } from "../_shared/siteUrl.ts";

serve(async (req) => {
  const url = new URL(req.url);
  const type = url.searchParams.get("type");
  const id = url.searchParams.get("id");
  if (!type || !id) return new Response("Missing type or id", { status: 400 });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") || "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
  );

  const tableByType: Record<string, string> = { petition: "petitions", poll: "polls", scorecard: "scorecards" };
  const table = tableByType[type];
  if (!table) return new Response("Unsupported type", { status: 400 });

  const { data } = await supabase.from(table).select("*").eq("id", id).single();
  const title = data?.title || data?.question || data?.name || "Voice to Action";
  const count = data?.signature_count_total || data?.total_votes_cached || data?.total_ratings || 0;
  const description = `${count} people have engaged. Join them.`;
  const pageType = type === "petition" ? "PetitionDetail" : type === "poll" ? "PollDetail" : "ScorecardDetail";
  const pageUrl = siteUrl(`/${pageType}?id=${id}`);
  const imageUrl = siteUrl(`/og/${type}/${id}.png`);

  const html = `<!doctype html><html><head>
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${description}" />
<meta property="og:image" content="${imageUrl}" />
<meta property="og:url" content="${pageUrl}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${title}" />
<meta name="twitter:description" content="${count} signatures and counting." />
<meta http-equiv="refresh" content="0; url=${pageUrl}" />
</head><body></body></html>`;

  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
});
