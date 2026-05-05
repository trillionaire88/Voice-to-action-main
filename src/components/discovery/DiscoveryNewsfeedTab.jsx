import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart3,
  FileText,
  Star,
  Users,
  TrendingUp,
  Clock,
  MapPin,
  CheckCircle2,
  Globe2,
  ArrowRight,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  fetchPollsPage,
  fetchPetitionsPage,
  fetchScorecardsPage,
  fetchCommunitiesPage,
  mapSortForDiscovery,
  itemCreatedMs,
} from "@/lib/discoveryFeedQueries";

const TYPE_CONFIG = {
  poll: {
    icon: BarChart3,
    color: "text-blue-500",
    bg: "bg-blue-50",
    label: "Poll",
    path: "/PollDetail",
    countKey: "total_votes_cached",
    countLabel: "votes",
  },
  petition: {
    icon: FileText,
    color: "text-emerald-500",
    bg: "bg-emerald-50",
    label: "Petition",
    path: "/PetitionDetail",
    countKey: "signature_count_total",
    countLabel: "signatures",
  },
  scorecard: {
    icon: Star,
    color: "text-amber-500",
    bg: "bg-amber-50",
    label: "Scorecard",
    path: "/ScorecardDetail",
    countKey: "rating_count",
    countLabel: "ratings",
  },
  community: {
    icon: Users,
    color: "text-teal-500",
    bg: "bg-teal-50",
    label: "Community",
    path: "/CommunityDetail",
    countKey: "member_count",
    countLabel: "members",
  },
};

const PAGE_SIZE = 20;

async function loadTabPage(pageNum, searchQuery, filters) {
  const perType = Math.ceil(PAGE_SIZE / 4);
  const search = searchQuery?.toLowerCase().trim();
  const common = { filters, tabKey: undefined, search };
  const rawSort = "-created_date";

  const [polls, petitions, scorecards, communities] = await Promise.all([
    fetchPollsPage({
      pageNum,
      perPage: perType,
      sort: mapSortForDiscovery("poll", rawSort),
      ...common,
      extra: { status: "open" },
    }),
    fetchPetitionsPage({
      pageNum,
      perPage: perType,
      sort: mapSortForDiscovery("petition", rawSort),
      ...common,
      extra: { status: "active" },
    }),
    fetchScorecardsPage({
      pageNum,
      perPage: perType,
      sort: mapSortForDiscovery("scorecard", rawSort),
      ...common,
      extra: {},
    }),
    fetchCommunitiesPage({
      pageNum,
      perPage: perType,
      ...common,
    }),
  ]);

  const tagged = [
    ...polls.map((p) => ({ item: p, type: "poll" })),
    ...petitions.map((p) => ({ item: p, type: "petition" })),
    ...scorecards.map((s) => ({ item: s, type: "scorecard" })),
    ...communities.map((c) => ({ item: c, type: "community" })),
  ].sort((a, b) => itemCreatedMs(b.item) - itemCreatedMs(a.item));

  const items = tagged.slice(0, PAGE_SIZE);
  const hasMore =
    items.length === PAGE_SIZE &&
    (polls.length === perType ||
      petitions.length === perType ||
      scorecards.length === perType ||
      communities.length === perType);

  return { items, hasMore };
}

function FeedCard({ item, type }) {
  const navigate = useNavigate();
  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.poll;
  const Icon = cfg.icon;
  const title = item.question || item.title || item.name || item.subject_name || "Untitled";
  const description = item.description || item.short_summary || item.context || "";
  const count =
    item[cfg.countKey] ?? item.signature_count_total ?? item.total_votes_cached ?? item.member_count ?? 0;

  return (
    <Card
      className="border-slate-200 hover:border-blue-200 hover:shadow-md transition-all cursor-pointer group"
      onClick={() => navigate(`${cfg.path}?id=${item.id}`)}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${cfg.bg} flex-shrink-0 mt-0.5`}>
            <Icon className={`w-4 h-4 ${cfg.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge variant="outline" className={`text-xs ${cfg.color} border-current`}>
                {cfg.label}
              </Badge>
              {item.category && (
                <Badge variant="secondary" className="text-xs">
                  {item.category.replace(/_/g, " ")}
                </Badge>
              )}
              {(item.is_verified || item.creator_verified) && (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              )}
              {(item.audience_type === "global" || item.location_scope === "global") && (
                <Globe2 className="w-3.5 h-3.5 text-slate-400" />
              )}
            </div>
            <h3 className="font-medium text-slate-900 text-sm leading-snug group-hover:text-blue-700 line-clamp-2 mb-1">
              {title}
            </h3>
            {description && <p className="text-xs text-slate-500 line-clamp-2 mb-2">{description}</p>}
            <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
              {count > 0 && (
                <span className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {count.toLocaleString()} {cfg.countLabel}
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
          <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-400 flex-shrink-0 mt-1 transition-colors" />
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton({ rows = 8 }) {
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

export default function DiscoveryNewsfeedTab({ searchQuery, filters }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchRef = useRef(async (_p, _r) => {});
  fetchRef.current = async (pageNum, reset = false) => {
    setLoading(true);
    try {
      const { items: results, hasMore: more } = await loadTabPage(pageNum, searchQuery, filters);
      setItems((prev) => (reset ? results : [...prev, ...results]));
      setHasMore(more);
    } catch (e) {
      console.error("Discovery tab feed error", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    setItems([]);
    fetchRef.current(1, true);
  }, [searchQuery, filters]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchRef.current(next, false);
  };

  if (loading && items.length === 0) return <LoadingSkeleton />;

  if (!loading && items.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400">
        <div className="text-4xl mb-3">📰</div>
        <p className="font-medium">Nothing in your feed yet</p>
        <p className="text-sm mt-1">Try adjusting your filters</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map(({ item, type }) => (
        <FeedCard key={`${type}-${item.id}`} item={item} type={type} />
      ))}
      {loading && items.length > 0 && <LoadingSkeleton rows={3} />}
      {hasMore && (
        <Button variant="outline" className="w-full" onClick={loadMore} disabled={loading}>
          {loading ? "Loading..." : "Load more"}
        </Button>
      )}
    </div>
  );
}
