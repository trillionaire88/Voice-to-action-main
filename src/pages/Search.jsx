import React, { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search, X, TrendingUp, FileText, Vote, Star,
  Users, Globe2, MessageSquare, Clock, CheckCircle2, SlidersHorizontal
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const TYPE_CONFIG = {
  petition: { icon: FileText, color: "bg-orange-50 text-orange-700 border-orange-200", label: "Petition" },
  poll: { icon: Vote, color: "bg-blue-50 text-blue-700 border-blue-200", label: "Poll" },
  scorecard: { icon: Star, color: "bg-amber-50 text-amber-700 border-amber-200", label: "Scorecard" },
  community: { icon: Users, color: "bg-purple-50 text-purple-700 border-purple-200", label: "Community" },
  user: { icon: Users, color: "bg-slate-50 text-slate-700 border-slate-200", label: "User" },
  discussion: { icon: MessageSquare, color: "bg-sky-50 text-sky-700 border-sky-200", label: "Discussion" },
  comment: { icon: MessageSquare, color: "bg-slate-50 text-slate-600 border-slate-200", label: "Comment" },
  issue: { icon: Globe2, color: "bg-indigo-50 text-indigo-700 border-indigo-200", label: "Issue" },
  timeline_event: { icon: Clock, color: "bg-teal-50 text-teal-700 border-teal-200", label: "Event" },
};

const SORT_OPTIONS = [
  { value: "relevance", label: "Relevance" },
  { value: "date", label: "Newest" },
  { value: "popularity", label: "Popularity" },
  { value: "credibility", label: "Credibility" },
];

const ALL_TYPES = Object.keys(TYPE_CONFIG);

function escapeIlike(q) {
  return q.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/**
 * Discoverable communities for search: public (and legacy null visibility) non-private-plan
 * rows, merged with communities the user is an active member of (so invite_only / private
 * remain findable for members only). Excludes hidden communities unless matched via membership.
 */
async function fetchCommunitiesForDiscovery(searchPattern, limit = 5) {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id ?? null;

  let memberIds = [];
  if (userId) {
    const { data: mem } = await supabase
      .from("community_members")
      .select("community_id")
      .eq("user_id", userId)
      .eq("status", "active");
    memberIds = [...new Set((mem || []).map((m) => m.community_id).filter(Boolean))];
  }

  const sel = "id, name, description_public, description, member_count, plan, is_hidden, visibility";

  let pubQ = supabase
    .from("communities")
    .select(sel)
    .or("is_hidden.is.null,is_hidden.eq.false")
    .or("visibility.eq.public,visibility.is.null")
    .neq("plan", "private");

  if (searchPattern && searchPattern.trim().length >= 2) {
    const safe = escapeIlike(searchPattern.trim());
    const p = `%${safe}%`;
    pubQ = pubQ.or(`name.ilike.${p},description_public.ilike.${p},description.ilike.${p}`);
  }

  const pubRes = await pubQ.order("member_count", { ascending: false }).limit(limit);

  let memRows = [];
  if (memberIds.length) {
    let memQ = supabase
      .from("communities")
      .select(sel)
      .in("id", memberIds)
      .or("is_hidden.is.null,is_hidden.eq.false");
    if (searchPattern && searchPattern.trim().length >= 2) {
      const safe = escapeIlike(searchPattern.trim());
      const p = `%${safe}%`;
      memQ = memQ.or(`name.ilike.${p},description_public.ilike.${p},description.ilike.${p}`);
    }
    const memRes = await memQ.order("member_count", { ascending: false }).limit(limit);
    memRows = memRes.data || [];
  }

  const map = new Map();
  for (const r of [...(pubRes.data || []), ...memRows]) {
    if (!map.has(r.id)) map.set(r.id, r);
  }
  return Array.from(map.values())
    .sort((a, b) => (b.member_count || 0) - (a.member_count || 0))
    .slice(0, limit);
}

async function fetchByTypesOnly(types) {
  const limit = 5;
  const out = [];
  const add = (arr, mapFn) => {
    for (const x of arr || []) out.push(mapFn(x));
  };

  if (types.includes("petition")) {
    const { data, error } = await supabase
      .from("petitions")
      .select("id, title, short_summary, signature_count_total, status, category, country_code, created_at")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (!error) add(data, (p) => mapSearchToResults({ petitions: [p], polls: [], profiles: [], communities: [], discussions: [] })[0]);
  }
  if (types.includes("poll")) {
    const { data, error } = await supabase
      .from("polls")
      .select("id, question, description, status, category, created_at, end_time")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (!error) add(data, (p) => mapSearchToResults({ petitions: [], polls: [p], profiles: [], communities: [], discussions: [] })[0]);
  }
  if (types.includes("user")) {
    const { data, error } = await supabase
      .from("public_profiles_view")
      .select("id, display_name, full_name, avatar_url, is_blue_verified, follower_count")
      .limit(limit);
    if (!error) add(data, (p) => mapSearchToResults({ petitions: [], polls: [], profiles: [p], communities: [], discussions: [] })[0]);
  }
  if (types.includes("community")) {
    const rows = await fetchCommunitiesForDiscovery(null, limit);
    add(rows, (c) => mapSearchToResults({ petitions: [], polls: [], profiles: [], communities: [c], discussions: [] })[0]);
  }
  if (types.includes("discussion")) {
    const pd = await supabase
      .from("policy_discussions")
      .select("id, title, body, created_at, policy_area")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (!pd.error && pd.data?.length) {
      add(pd.data, (d) => mapSearchToResults({ petitions: [], polls: [], profiles: [], communities: [], discussions: [d] })[0]);
    } else {
      const d2 = await supabase
        .from("discussions")
        .select("id, title, body, created_at")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (!d2.error) add(d2.data, (d) => mapSearchToResults({ petitions: [], polls: [], profiles: [], communities: [], discussions: [d] })[0]);
    }
  }
  return out;
}

async function searchAll(query) {
  if (!query || query.trim().length < 2) return null;
  const raw = query.trim();
  const safe = escapeIlike(raw);
  const pattern = `%${safe}%`;

  const orPetition = `title.ilike.${pattern},short_summary.ilike.${pattern},target_name.ilike.${pattern}`;
  const orPoll = `question.ilike.${pattern},description.ilike.${pattern}`;
  const orProfile = `display_name.ilike.${pattern},full_name.ilike.${pattern}`;
  const orDiscussion = `title.ilike.${pattern},body.ilike.${pattern}`;

  const [
    petitionsR,
    pollsR,
    profilesR,
    policyDiscussionsR,
    discussionsR,
  ] = await Promise.all([
    supabase
      .from("petitions")
      .select("id, title, short_summary, signature_count_total, status, category, country_code, created_at")
      .or(orPetition)
      .eq("status", "active")
      .limit(5),
    supabase
      .from("polls")
      .select("id, question, description, status, category, created_at, end_time")
      .or(orPoll)
      .eq("status", "open")
      .limit(5),
    supabase
      .from("public_profiles_view")
      .select("id, display_name, full_name, avatar_url, is_blue_verified, follower_count")
      .or(orProfile)
      .limit(5),
    supabase
      .from("policy_discussions")
      .select("id, title, body, created_at, policy_area")
      .or(orDiscussion)
      .limit(5),
    supabase
      .from("discussions")
      .select("id, title, body, created_at")
      .or(orDiscussion)
      .limit(5),
  ]);

  const communitiesData = await fetchCommunitiesForDiscovery(raw, 5);

  const discussionsData =
    !policyDiscussionsR.error && policyDiscussionsR.data?.length
      ? policyDiscussionsR.data
      : !discussionsR.error && discussionsR.data?.length
        ? discussionsR.data
        : [];

  return {
    petitions: petitionsR.error ? [] : petitionsR.data || [],
    polls: pollsR.error ? [] : pollsR.data || [],
    profiles: profilesR.error ? [] : profilesR.data || [],
    communities: communitiesData || [],
    discussions: discussionsData,
  };
}

function mapSearchToResults(data) {
  const out = [];
  const ts = (d) => d?.created_at || d?.created_date || null;

  for (const p of data.petitions || []) {
    out.push({
      id: `petition-${p.id}`,
      content_type: "petition",
      content_id: p.id,
      title: p.title,
      description: p.short_summary || "",
      tags: p.category ? [String(p.category).replace(/_/g, " ")] : [],
      signature_count: p.signature_count_total || 0,
      country_code: p.country_code,
      is_verified: false,
      indexed_at: ts(p),
      credibility_score: 0,
    });
  }
  for (const p of data.polls || []) {
    out.push({
      id: `poll-${p.id}`,
      content_type: "poll",
      content_id: p.id,
      title: p.question,
      description: p.description || "",
      tags: p.category ? [String(p.category).replace(/_/g, " ")] : [],
      signature_count: 0,
      indexed_at: ts(p),
      credibility_score: 0,
    });
  }
  for (const pr of data.profiles || []) {
    out.push({
      id: `user-${pr.id}`,
      content_type: "user",
      content_id: pr.id,
      title: pr.display_name || pr.full_name || "User",
      description: "",
      tags: [],
      is_verified: !!pr.is_blue_verified,
      signature_count: 0,
      indexed_at: null,
      credibility_score: 0,
    });
  }
  for (const c of data.communities || []) {
    out.push({
      id: `community-${c.id}`,
      content_type: "community",
      content_id: c.id,
      title: c.name || "Community",
      description: c.description_public || c.description || "",
      tags: c.plan ? [c.plan] : [],
      signature_count: 0,
      indexed_at: null,
      credibility_score: 0,
    });
  }
  for (const d of data.discussions || []) {
    out.push({
      id: `discussion-${d.id}`,
      content_type: "discussion",
      content_id: d.id,
      title: d.title,
      description: (d.body || "").slice(0, 200),
      tags: d.policy_area ? [String(d.policy_area).replace(/_/g, " ")] : [],
      signature_count: 0,
      indexed_at: ts(d),
      credibility_score: 0,
    });
  }
  return out;
}

function filterByTypes(results, types) {
  if (!types || types.length === 0) return results;
  return results.filter((r) => types.includes(r.content_type));
}

function sortResults(results, sort) {
  const copy = [...results];
  if (sort === "date") {
    copy.sort((a, b) => new Date(b.indexed_at || 0) - new Date(a.indexed_at || 0));
  } else if (sort === "popularity") {
    copy.sort((a, b) => (b.signature_count || 0) - (a.signature_count || 0));
  } else if (sort === "credibility") {
    copy.sort((a, b) => (b.credibility_score || 0) - (a.credibility_score || 0));
  }
  return copy;
}

async function fetchTrending() {
  const [petitionsR, pollsR] = await Promise.all([
    supabase
      .from("petitions")
      .select("id, title, short_summary, signature_count_total, status, category, country_code, created_at")
      .eq("status", "active")
      .order("signature_count_total", { ascending: false })
      .limit(5),
    supabase
      .from("polls")
      .select("id, question, description, status, category, created_at")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);
  const mapped = mapSearchToResults({
    petitions: petitionsR.data || [],
    polls: pollsR.data || [],
    profiles: [],
    communities: [],
    discussions: [],
  });
  return mapped.slice(0, 8);
}

async function fetchAutocomplete(q) {
  const data = await searchAll(q);
  if (!data) return [];
  const mapped = mapSearchToResults(data);
  return mapped.slice(0, 8).map((r) => ({ text: r.title, type: r.content_type }));
}

function ResultCard({ item, onClick }) {
  const cfg = TYPE_CONFIG[item.content_type] || TYPE_CONFIG.issue;
  const Icon = cfg.icon;
  return (
    <Card className="border-slate-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer" onClick={onClick}>
      <CardContent className="pt-3 pb-3">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg border flex-shrink-0 ${cfg.color}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
              <Badge className={`${cfg.color} text-[10px]`}>{cfg.label}</Badge>
              {item.is_trending && <Badge className="bg-red-50 text-red-600 border-red-200 text-[10px]">Trending</Badge>}
              {item.is_verified && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
              {item.country_code && <Badge variant="outline" className="text-[10px]">{item.country_code}</Badge>}
            </div>
            <p className="font-semibold text-sm text-slate-800 line-clamp-1">{item.title}</p>
            {item.description && <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{item.description}</p>}
            <div className="flex flex-wrap gap-1 mt-1.5">
              {(item.tags || []).slice(0, 3).map((t) => (
                <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
              ))}
            </div>
            <div className="flex gap-3 text-[10px] text-slate-400 mt-1">
              {item.credibility_score > 0 && <span>Credibility {item.credibility_score}</span>}
              {item.signature_count > 0 && <span>{item.signature_count.toLocaleString()} signatures</span>}
              {item.indexed_at && <span>{formatDistanceToNow(new Date(item.indexed_at), { addSuffix: true })}</span>}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SearchPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [sort, setSort] = useState("relevance");
  const [total, setTotal] = useState(0);
  const debounceRef = useRef(null);
  const suggestRef = useRef(null);

  useEffect(() => {
    fetchTrending().then(setTrending).catch(() => setTrending([]));
  }, []);

  useEffect(() => {
    if (suggestRef.current) clearTimeout(suggestRef.current);
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }
    suggestRef.current = setTimeout(async () => {
      const s = await fetchAutocomplete(query).catch(() => []);
      setSuggestions(s);
    }, 400);
  }, [query]);

  const doSearch = useCallback(async (q = query, types = selectedTypes, s = sort) => {
    const trimmed = (q || "").trim();
    if (!trimmed && types.length === 0) return;
    setLoading(true);
    setHasSearched(true);
    setSuggestions([]);
    try {
      let merged;
      if (!trimmed && types.length > 0) {
        merged = await fetchByTypesOnly(types);
      } else if (trimmed.length < 2) {
        merged = [];
      } else {
        const data = await searchAll(trimmed);
        merged = data ? mapSearchToResults(data) : [];
      }
      merged = filterByTypes(merged, types.length ? types : []);
      merged = sortResults(merged, s);
      setResults(merged);
      setTotal(merged.length);
    } catch {
      setResults([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [query, selectedTypes, sort]);

  const handleKey = (e) => {
    if (e.key === "Enter") doSearch();
  };

  const toggleType = (t) => {
    const next = selectedTypes.includes(t) ? selectedTypes.filter((x) => x !== t) : [...selectedTypes, t];
    setSelectedTypes(next);
    if (hasSearched) doSearch(query, next, sort);
  };

  const handleResultClick = (item) => {
    if (!item.content_id) return;
    const id = String(item.content_id).replace(/[^a-zA-Z0-9\-_]/g, "").slice(0, 128);
    if (!id) return;
    if (item.content_type === "petition") navigate(createPageUrl("PetitionDetail") + `?id=${id}`);
    else if (item.content_type === "poll") navigate(createPageUrl("PollDetail") + `?id=${id}`);
    else if (item.content_type === "community") navigate(createPageUrl("CommunityDetail") + `?id=${id}`);
    else if (item.content_type === "scorecard") navigate(createPageUrl("ScorecardDetail") + `?id=${id}`);
    else if (item.content_type === "user") navigate(createPageUrl("Profile") + `?userId=${id}`);
    else if (item.content_type === "discussion") navigate(createPageUrl("PolicyDiscussions") + `?focus=${id}`);
    else if (item.content_type === "comment" && item.parent_id) {
      navigate(createPageUrl("PollDetail") + `?id=${item.parent_id}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-full px-4 py-1.5 text-sm font-semibold mb-4">
          <Search className="w-4 h-4" />Search Engine
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Search Everything</h1>
        <p className="text-slate-500">Petitions, polls, communities, scorecards, users and more</p>
      </div>

      <div className="relative mb-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              className="w-full border border-slate-200 rounded-xl pl-11 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent shadow-sm bg-white text-slate-900 placeholder:text-slate-400"
              placeholder="Search petitions, votes, communities, users…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKey}
            />
            {query && (
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" onClick={() => { setQuery(""); setResults([]); setHasSearched(false); }}>
                <X className="w-4 h-4" />
              </button>
            )}
            {suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-xl z-20 mt-1 overflow-hidden">
                {suggestions.map((s, i) => (
                  <button key={i} type="button" className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center gap-2 text-sm" onClick={() => { setQuery(s.text); setSuggestions([]); doSearch(s.text); }}>
                    <Search className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-slate-700">{s.text}</span>
                    {s.type !== "tag" && <Badge variant="outline" className="text-[10px] ml-auto capitalize">{s.type}</Badge>}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button type="button" onClick={() => doSearch()} className="bg-blue-600 hover:bg-blue-700 px-6">Search</Button>
          <Button type="button" variant="outline" onClick={() => setShowFilters(!showFilters)}><SlidersHorizontal className="w-4 h-4" /></Button>
        </div>
      </div>

      {showFilters && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4 shadow-sm space-y-3">
          <div>
            <p className="text-xs font-semibold text-slate-600 mb-2">Filter by type</p>
            <div className="flex flex-wrap gap-1.5">
              {ALL_TYPES.map((t) => {
                const cfg = TYPE_CONFIG[t];
                return (
                  <button key={t} type="button" onClick={() => toggleType(t)} className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border transition-all ${selectedTypes.includes(t) ? cfg.color : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                    <cfg.icon className="w-3 h-3" />{cfg.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-600 mb-2">Sort by</p>
            <div className="flex gap-1.5 flex-wrap">
              {SORT_OPTIONS.map((o) => (
                <button key={o.value} type="button" onClick={() => { setSort(o.value); if (hasSearched) doSearch(query, selectedTypes, o.value); }}
                  className={`px-3 py-1 rounded-full text-xs border transition-all ${sort === o.value ? "bg-blue-600 text-white border-blue-600" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : hasSearched ? (
        <>
          <p className="text-sm text-slate-500 mb-3">{total} result{total !== 1 ? "s" : ""} found</p>
          {results.length === 0 ? (
            <div className="text-center py-12">
              <Search className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No results found</p>
              <p className="text-sm text-slate-400 mt-1">Try different keywords or remove filters</p>
            </div>
          ) : (
            <div className="space-y-2">
              {results.map((r) => <ResultCard key={r.id} item={r} onClick={() => handleResultClick(r)} />)}
            </div>
          )}
        </>
      ) : (
        <div className="space-y-6">
          {trending.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-red-500" />Trending Now</h3>
              <div className="space-y-2">
                {trending.slice(0, 5).map((t) => <ResultCard key={t.id} item={{ ...t, is_trending: true }} onClick={() => handleResultClick(t)} />)}
              </div>
            </div>
          )}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Browse by type</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {ALL_TYPES.slice(0, 8).map((t) => {
                const cfg = TYPE_CONFIG[t];
                return (
                  <button key={t} type="button" onClick={() => { setSelectedTypes([t]); doSearch("", [t]); }} className="flex flex-col items-center gap-2 p-4 border border-slate-200 rounded-xl hover:border-blue-300 hover:bg-blue-50/30 transition-all">
                    <div className={`p-2.5 rounded-xl border ${cfg.color}`}><cfg.icon className="w-5 h-5" /></div>
                    <span className="text-xs font-medium text-slate-700">{cfg.label}s</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
