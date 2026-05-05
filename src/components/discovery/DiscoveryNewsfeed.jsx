import React, { useState, useEffect, useCallback } from "react";
import { api } from '@/api/client';
import { useNavigate } from "react-router-dom";
import PullToRefresh from "@/components/ui/PullToRefresh";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, FileText, Vote, Star, Users, AlertCircle, TrendingUp, Clock, MapPin, CheckCircle2, Globe2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const TYPE_CONFIG = {
  poll:      { icon: BarChart3,   color: "text-blue-500",   bg: "bg-blue-50",   label: "Poll",      path: "/PollDetail" },
  petition:  { icon: FileText,    color: "text-emerald-500",bg: "bg-emerald-50",label: "Petition",  path: "/PetitionDetail" },
  vote:      { icon: Vote,        color: "text-purple-500", bg: "bg-purple-50", label: "Vote",      path: "/PublicVoting" },
  scorecard: { icon: Star,        color: "text-amber-500",  bg: "bg-amber-50",  label: "Scorecard", path: "/ScorecardDetail" },
  community: { icon: Users,       color: "text-teal-500",   bg: "bg-teal-50",   label: "Community", path: "/CommunityDetail" },
  issue:     { icon: AlertCircle, color: "text-rose-500",   bg: "bg-rose-50",   label: "Issue",     path: "/CurrentIssues" },
};

function ContentCard({ item, type }) {
  const navigate = useNavigate();
  const config = TYPE_CONFIG[type] || TYPE_CONFIG.poll;
  const Icon = config.icon;

  const handleClick = () => {
    if (config.path) {
      navigate(`${config.path}?id=${item.id}`);
    }
  };

  const title = item.question || item.title || item.name || "Untitled";
  const description = item.description || item.context || "";
  const count = item.vote_count || item.signature_count || item.member_count || 0;
  const isVerified = item.is_verified || item.creator_verified;
  const location = item.location_scope || item.audience_type;

  return (
    <Card
      className="border-slate-200 hover:border-blue-200 hover:shadow-md transition-all cursor-pointer group"
      onClick={handleClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${config.bg} flex-shrink-0 mt-0.5`}>
            <Icon className={`w-4 h-4 ${config.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge variant="outline" className={`text-xs ${config.color} border-current`}>{config.label}</Badge>
              {item.category && <Badge variant="secondary" className="text-xs">{item.category.replace(/_/g, " ")}</Badge>}
              {isVerified && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
              {location === "global" && <Globe2 className="w-3.5 h-3.5 text-slate-400" />}
            </div>
            <h3 className="font-medium text-slate-900 text-sm leading-snug group-hover:text-blue-700 line-clamp-2 mb-1">
              {title}
            </h3>
            {description && (
              <p className="text-xs text-slate-500 line-clamp-2 mb-2">{description}</p>
            )}
            <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
              {count > 0 && (
                <span className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {count.toLocaleString()} {type === "petition" ? "signatures" : type === "community" ? "members" : "votes"}
                </span>
              )}
              {item.created_date && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDistanceToNow(new Date(item.created_date), { addSuffix: true })}
                </span>
              )}
              {item.location_scope && item.location_scope !== "global" && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {item.location_scope}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(6)].map((_, i) => (
        <Card key={i} className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <Skeleton className="w-8 h-8 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function DiscoveryNewsfeed({ contentType, tabKey, searchQuery, filters, user }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 20;

  useEffect(() => {
    setPage(1);
    setItems([]);
    fetchItems(1, true);
  }, [contentType, tabKey, searchQuery, filters]);

  const handleRefresh = useCallback(async () => {
    setPage(1);
    await fetchItems(1, true);
  }, [contentType, tabKey, searchQuery, filters]);

  const fetchItems = async (pageNum, reset = false) => {
    setLoading(true);
    try {
      const results = await loadContent(contentType, tabKey, searchQuery, filters, pageNum, PAGE_SIZE);
      setItems(prev => reset ? results : [...prev, ...results]);
      setHasMore(results.length === PAGE_SIZE);
    } catch (e) {
      console.error("Feed load error", e);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchItems(next);
  };

  if (loading && items.length === 0) return <LoadingSkeleton />;

  if (!loading && items.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400">
        <div className="text-4xl mb-3">🔍</div>
        <p className="font-medium">Nothing found</p>
        <p className="text-sm mt-1">Try adjusting your filters or search terms</p>
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-3">
        {items.map(({ item, type }) => (
          <ContentCard key={`${type}-${item.id}`} item={item} type={type} />
        ))}
        {hasMore && (
          <Button variant="outline" className="w-full" onClick={loadMore} disabled={loading}>
            {loading ? "Loading..." : "Load more"}
          </Button>
        )}
      </div>
    </PullToRefresh>
  );
}

async function loadContent(contentType, tabKey, searchQuery, filters, page, pageSize) {
  const skip = (page - 1) * pageSize;
  const sortMap = {
    trending: "-vote_count",
    recent: "-created_date",
    most_voted: "-vote_count",
    most_active: "-updated_date",
    highest_credibility: "-credibility_score",
  };
  const sort = sortMap[filters.sort] || "-created_date";

  const buildQuery = (extra = {}) => {
    const q = { ...extra };
    if (filters.category && filters.category !== "all") q.category = filters.category;
    if (filters.verifiedOnly) q.is_verified = true;
    if (tabKey === "local" && filters.location && filters.location !== "global") {
      q.location_scope = filters.location;
    }
    if (tabKey === "global") q.location_scope = "global";
    if (tabKey === "trending") q.is_trending = true;
    return q;
  };

  const search = searchQuery?.toLowerCase().trim();

  const fetchAndTag = async (entity, type, extraQuery = {}) => {
    try {
      const query = buildQuery(extraQuery);
      const records = await api.entities[entity].filter(query, sort, pageSize, skip);
      return records
        .filter(r => !search || (r.question || r.title || r.name || "").toLowerCase().includes(search))
        .map(r => ({ item: r, type }));
    } catch {
      return [];
    }
  };

  if (contentType === "poll")      return fetchAndTag("Poll", "poll");
  if (contentType === "petition")  return fetchAndTag("Petition", "petition", { status: "active" });
  if (contentType === "scorecard") return fetchAndTag("Scorecard", "scorecard");
  if (contentType === "community") return fetchAndTag("Community", "community", { status: "active" });
  if (contentType === "issue")     return fetchAndTag("Petition", "issue", { category: "governance_policy" });

  // Mixed feed (newsfeed, trending, global, local, all)
  const [polls, petitions, scorecards] = await Promise.all([
    fetchAndTag("Poll", "poll"),
    fetchAndTag("Petition", "petition", { status: "active" }),
    fetchAndTag("Scorecard", "scorecard"),
  ]);

  // Interleave results
  const combined = [];
  const maxLen = Math.max(polls.length, petitions.length, scorecards.length);
  for (let i = 0; i < maxLen; i++) {
    if (polls[i]) combined.push(polls[i]);
    if (petitions[i]) combined.push(petitions[i]);
    if (scorecards[i]) combined.push(scorecards[i]);
  }

  return combined.slice(0, pageSize);
}