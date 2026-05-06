import { supabase } from "@/lib/supabase";

/** Escape `%` / `_` for Postgres ILIKE patterns (wildcards). */
export function escapeIlike(str) {
  if (!str) return "";
  return str.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

function applyOrder(q, order) {
  if (!order) return q;
  const str = String(order).trim();
  if (!str) return q;
  const descending = str.startsWith("-");
  const field = descending || str.startsWith("+") ? str.slice(1) : str;
  if (!field) return q;
  return q.order(field, { ascending: !descending });
}

/**
 * Apply equality filters from discovery UI (category, verified, location, trending).
 */
function applyDiscoveryEqFilters(q, { filters, tabKey, extra = {} }) {
  let query = q;
  const merged = { ...extra };
  if (filters?.category && filters.category !== "all") merged.category = filters.category;
  if (filters?.verifiedOnly) merged.is_verified = true;
  if (tabKey === "local" && filters?.location && filters.location !== "global") {
    merged.location_scope = filters.location;
  }
  if (tabKey === "global") merged.location_scope = "global";
  if (tabKey === "trending") merged.is_trending = true;
  Object.entries(merged).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") query = query.eq(k, v);
  });
  return query;
}

function appendSearchOrPolls(query, search) {
  const s = search?.trim();
  if (!s) return query;
  const p = `%${escapeIlike(s)}%`;
  return query.or(`question.ilike.${p},description.ilike.${p}`);
}

function appendSearchOrPetitions(query, search) {
  const s = search?.trim();
  if (!s) return query;
  const p = `%${escapeIlike(s)}%`;
  return query.or(`title.ilike.${p},short_summary.ilike.${p},full_description.ilike.${p}`);
}

function appendSearchOrScorecards(query, search) {
  const s = search?.trim();
  if (!s) return query;
  const p = `%${escapeIlike(s)}%`;
  return query.or(`name.ilike.${p},subject_name.ilike.${p},description.ilike.${p}`);
}

function appendSearchOrCommunities(query, search) {
  const s = search?.trim();
  if (!s) return query;
  const p = `%${escapeIlike(s)}%`;
  return query.or(`name.ilike.${p},description.ilike.${p}`);
}

/**
 * One page of polls with server-side range + optional search.
 */
export async function fetchPollsPage({
  pageNum,
  perPage,
  sort,
  filters,
  tabKey,
  search,
  extra = {},
}) {
  const start = (pageNum - 1) * perPage;
  const end = start + perPage - 1;
  let q = supabase.from("polls").select("*");
  q = applyDiscoveryEqFilters(q, { filters, tabKey, extra });
  q = appendSearchOrPolls(q, search);
  q = applyOrder(q, sort);
  q = q.range(start, end);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function fetchPetitionsPage({
  pageNum,
  perPage,
  sort,
  filters,
  tabKey,
  search,
  extra = {},
}) {
  const start = (pageNum - 1) * perPage;
  const end = start + perPage - 1;
  let q = supabase.from("petitions").select("*");
  q = applyDiscoveryEqFilters(q, { filters, tabKey, extra });
  q = appendSearchOrPetitions(q, search);
  q = applyOrder(q, sort);
  q = q.range(start, end);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function fetchScorecardsPage({
  pageNum,
  perPage,
  sort,
  filters,
  tabKey,
  search,
  extra = {},
}) {
  const start = (pageNum - 1) * perPage;
  const end = start + perPage - 1;
  let q = supabase.from("scorecards").select("*");
  q = applyDiscoveryEqFilters(q, { filters, tabKey, extra });
  q = appendSearchOrScorecards(q, search);
  q = applyOrder(q, sort);
  q = q.range(start, end);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function fetchCommunitiesPage({
  pageNum,
  perPage,
  filters,
  tabKey,
  search,
}) {
  const start = (pageNum - 1) * perPage;
  const end = start + perPage - 1;
  let q = supabase.from("communities").select("*").eq("is_private", false);
  q = applyDiscoveryEqFilters(q, { filters, tabKey, extra: {} });
  q = appendSearchOrCommunities(q, search);
  q = q.order("created_at", { ascending: false });
  q = q.range(start, end);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

/** Map UI sort keys to table-specific columns (petitions/scorecards use different vote proxies). */
export function mapSortForDiscovery(entityKind, rawSort) {
  const s = rawSort || "-created_date";
  if (entityKind === "petition" || entityKind === "issue") {
    if (s === "-vote_count") return "-signature_count_total";
  }
  if (entityKind === "scorecard") {
    if (s === "-vote_count") return "-total_ratings";
  }
  return s;
}

/** Created timestamp for sorting mixed feeds (supports legacy column names). */
export function itemCreatedMs(item) {
  const d = item?.created_date ?? item?.created_at;
  if (!d) return 0;
  const t = new Date(d).getTime();
  return Number.isFinite(t) ? t : 0;
}
