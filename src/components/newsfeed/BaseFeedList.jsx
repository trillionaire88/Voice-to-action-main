import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import PullToRefresh from "@/components/ui/PullToRefresh";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import FeedItemCard from "./FeedItemCard";
import { callNewsfeedEngine } from "./feedApi";

function FeedSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
    </div>
  );
}

const FEED_LOAD_TIMEOUT_MS = 8000;

export default function BaseFeedList({ feedType, countryCode, staleTime = 300000, emptyMessage, topSlot, sectionTitle }) {
  const [page, setPage] = useState(0);
  const [items, setItems] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [loadTimedOut, setLoadTimedOut] = useState(false);
  const queryKey = useMemo(() => ["newsfeed", feedType, page, countryCode], [feedType, page, countryCode]);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey,
    queryFn: () => callNewsfeedEngine(feedType, { page, pageSize: 20, countryCode }),
    staleTime,
  });

  useEffect(() => {
    if (!isLoading || items.length > 0) {
      setLoadTimedOut(false);
      return;
    }
    const t = setTimeout(() => setLoadTimedOut(true), FEED_LOAD_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [isLoading, items.length]);

  useEffect(() => {
    if (!data) return;
    setItems((prev) => page === 0 ? data.items || [] : [...prev, ...(data.items || [])]);
    setHasMore(!!data.has_more);
  }, [data, page]);

  useEffect(() => {
    const onScroll = () => {
      const pct = (window.scrollY + window.innerHeight) / (document.body.scrollHeight || 1);
      if (pct > 0.8 && hasMore && !isFetching) setPage((p) => p + 1);
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [hasMore, isFetching]);

  const onHidden = (id) => setItems((prev) => prev.filter((i) => i.id !== id));
  const refresh = async () => {
    setPage(0);
    setItems([]);
    await callNewsfeedEngine(feedType, { page: 0, refresh: true, countryCode }).then((r) => {
      setItems(r.items || []);
      setHasMore(!!r.has_more);
    });
    refetch();
  };

  return (
    <PullToRefresh onRefresh={refresh}>
      <div className="space-y-4">
        {topSlot}
        {sectionTitle && <h3 className="text-sm font-semibold text-slate-700">{sectionTitle}</h3>}
        {isLoading && items.length === 0 && !loadTimedOut ? (
          <FeedSkeleton />
        ) : items.length === 0 ? (
          <div className="text-center text-slate-500 py-10">{emptyMessage || "You're all caught up."}</div>
        ) : (
          items.map((item) => <FeedItemCard key={item.feed_id} item={item} onHidden={onHidden} />)
        )}
        {!hasMore && items.length > 0 && (
          <div className="text-center py-5">
            <p className="text-sm text-slate-500 mb-2">You're all caught up</p>
            <Button variant="outline" onClick={refresh}>Refresh feed</Button>
          </div>
        )}
      </div>
    </PullToRefresh>
  );
}
