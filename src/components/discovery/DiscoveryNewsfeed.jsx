import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import PullToRefresh from "@/components/ui/PullToRefresh";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart3,
  FileText,
  Vote,
  Star,
  Users,
  AlertCircle,
  TrendingUp,
  Clock,
  MapPin,
  CheckCircle2,
  Globe2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  fetchPollsPage,
  fetchPetitionsPage,
  fetchScorecardsPage,
  fetchCommunitiesPage,
  mapSortForDiscovery,
} from "@/lib/discoveryFeedQueries";

const TYPE_CONFIG = {
  poll: { icon: BarChart3, color: "text-blue-500", bg: "bg-blue-50", label: "Poll", path: "/PollDetail" },
  petition: { icon: FileText, color: "text-emerald-500", bg: "bg-emerald-50", label: "Petition", path: "/PetitionDetail" },
  vote: { icon: Vote, color: "text-purple-500", bg: "bg-purple-50", label: "Vote", path: "/PublicVoting" },
  scorecard: { icon: Star, color: "text-amber-500", bg: "bg-amber-50", label: "Scorecard", path: "/ScorecardDetail" },
  community: { icon: Users, color: "text-teal-500", bg: "bg-teal-50", label: "Community", path: "/CommunityDetail" },
  issue: { icon: AlertCircle, color: "text-rose-500", bg: "bg-rose-50", label: "Issue", path: "/CurrentIssues" },
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
  const count =
    item.vote_count ||
    item.signature_count_total ||
    item.signature_count ||
    item.member_count ||
    0;
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
              <Badge variant="outline" className={`text-xs ${config.color} border-current`}>
                {config.label}
              </Badge>
              {item.category && (
                <Badge variant="secondary" className="text-xs">
                  {item.category.replace(/_/g, " ")}
                </Badge>
              )}
              {isVerified && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
              {location === "global" && <Globe2 className="w-3.5 h-3.5 text-slate-400" />}
            </div>
            <h3 className="font-medium text-slate-900 text-sm leading-snug group-hover:text-blue-700 line-clamp-2 mb-1">
              {title}
            </h3>
            {description && <p className="text-xs text-slate-500 line-clamp-2 mb-2">{description}</p>}
            <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
              {count > 0 && (
                <span className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {count.toLocaleString()}{" "}
                  {type === "petition" ? "signatures" : type === "community" ? "members" : "votes"}
                </span>
              )}
              {(item.created_date || item.created_at) && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDistanceToNow(new Date(item.created_date || item.created_at), { addSuffix: true })}
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

function LoadingSkeleton({ rows = 6 }) {
  return (
    <div className="space-y-3">
      {[...Array(rows)].map((_, i) => (
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

async function loadContent(contentType, tabKey, searchQuery, filters, pageNum, pageSize) {
  const sortMap = {
    trending: "-vote_count",
    recent: "-created_date",
    most_voted: "-vote_count",
    most_active: "-updated_date",
    highest_credibility: "-credibility_score",
  };
  const rawSort = sortMap[filters.sort] || "-created_date";
  const search = searchQuery?.toLowerCase().trim();

  const commonArgs = { filters, tabKey, search };

  if (contentType === "poll") {
    const sort = mapSortForDiscovery("poll", rawSort);
    const rows = await fetchPollsPage({ pageNum, perPage: pageSize, sort, ...commonArgs, extra: {} });
    return {
      items: rows.map((r) => ({ item: r, type: "poll" })),
      hasMore: rows.length === pageSize,
    };
  }

  if (contentType === "petition") {
    const sort = mapSortForDiscovery("petition", rawSort);
    const rows = await fetchPetitionsPage({
      pageNum,
      perPage: pageSize,
      sort,
      ...commonArgs,
      extra: { status: "active" },
    });
    return {
      items: rows.map((r) => ({ item: r, type: "petition" })),
      hasMore: rows.length === pageSize,
    };
  }

  if (contentType === "scorecard") {
    const sort = mapSortForDiscovery("scorecard", rawSort);
    const rows = await fetchScorecardsPage({ pageNum, perPage: pageSize, sort, ...commonArgs, extra: {} });
    return {
      items: rows.map((r) => ({ item: r, type: "scorecard" })),
      hasMore: rows.length === pageSize,
    };
  }

  if (contentType === "community") {
    const rows = await fetchCommunitiesPage({ pageNum, perPage: pageSize, filters, tabKey, search });
    return {
      items: rows.map((r) => ({ item: r, type: "community" })),
      hasMore: rows.length === pageSize,
    };
  }

  if (contentType === "issue") {
    const sort = mapSortForDiscovery("issue", rawSort);
    const rows = await fetchPetitionsPage({
      pageNum,
      perPage: pageSize,
      sort,
      ...commonArgs,
      extra: { category: "governance_policy" },
    });
    return {
      items: rows.map((r) => ({ item: r, type: "issue" })),
      hasMore: rows.length === pageSize,
    };
  }

  // Mixed feed: PAGE_SIZE / 3 rows per type from DB, then interleave → pageSize total.
  const perType = Math.ceil(pageSize / 3);
  const sortPoll = mapSortForDiscovery("poll", rawSort);
  const sortPet = mapSortForDiscovery("petition", rawSort);
  const sortSc = mapSortForDiscovery("scorecard", rawSort);

  const [polls, petitions, scorecards] = await Promise.all([
    fetchPollsPage({ pageNum, perPage: perType, sort: sortPoll, ...commonArgs, extra: {} }),
    fetchPetitionsPage({ pageNum, perPage: perType, sort: sortPet, ...commonArgs, extra: { status: "active" } }),
    fetchScorecardsPage({ pageNum, perPage: perType, sort: sortSc, ...commonArgs, extra: {} }),
  ]);

  const taggedPolls = polls.map((r) => ({ item: r, type: "poll" }));
  const taggedPet = petitions.map((r) => ({ item: r, type: "petition" }));
  const taggedSc = scorecards.map((r) => ({ item: r, type: "scorecard" }));

  const combined = [];
  const maxLen = Math.max(taggedPolls.length, taggedPet.length, taggedSc.length);
  for (let i = 0; i < maxLen; i++) {
    if (taggedPolls[i]) combined.push(taggedPolls[i]);
    if (taggedPet[i]) combined.push(taggedPet[i]);
    if (taggedSc[i]) combined.push(taggedSc[i]);
  }

  const items = combined.slice(0, pageSize);
  const hasMore =
    items.length === pageSize &&
    (polls.length === perType || petitions.length === perType || scorecards.length === perType);

  return { items, hasMore };
}

export default function DiscoveryNewsfeed({ contentType, tabKey, searchQuery, filters }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 20;

  const fetchRef = useRef(async (_pageNum, _reset) => {});
  fetchRef.current = async (pageNum, reset = false) => {
    setLoading(true);
    try {
      const { items: results, hasMore: more } = await loadContent(
        contentType,
        tabKey,
        searchQuery,
        filters,
        pageNum,
        PAGE_SIZE,
      );
      setItems((prev) => (reset ? results : [...prev, ...results]));
      setHasMore(more);
    } catch (e) {
      console.error("Feed load error", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    setItems([]);
    fetchRef.current(1, true);
  }, [contentType, tabKey, searchQuery, filters]);

  const handleRefresh = useCallback(async () => {
    setPage(1);
    await fetchRef.current(1, true);
  }, []);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchRef.current(next, false);
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
        {loading && items.length > 0 && <LoadingSkeleton rows={3} />}
        {hasMore && (
          <Button variant="outline" className="w-full" onClick={loadMore} disabled={loading}>
            {loading ? "Loading..." : "Load more"}
          </Button>
        )}
      </div>
    </PullToRefresh>
  );
}
