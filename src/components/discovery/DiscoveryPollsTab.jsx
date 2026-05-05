import React, { useState } from "react";
import { api } from '@/api/client';
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PollCard from "@/components/polls/PollCard";
import VirtualFeed from "@/components/ui/VirtualFeed";
import { TrendingUp, Sparkles, Clock } from "lucide-react";

export default function DiscoveryPollsTab({ searchQuery, filters, user }) {
  const navigate = useNavigate();
  const [sortBy, setSortBy] = useState("trending");

  const { data: polls = [], isLoading } = useQuery({
    queryKey: ["discovery-polls", sortBy, filters, searchQuery],
    queryFn: async () => {
      let all = await api.entities.Poll.list("-created_date", 100);
      let open = all.filter(p => p.status === "open");
      if (filters.category && filters.category !== "all") open = open.filter(p => p.category === filters.category);
      if (filters.verifiedOnly) open = open.filter(p => p.is_verified);
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        open = open.filter(p => (p.question || "").toLowerCase().includes(q) || p.tags?.some(t => t.toLowerCase().includes(q)));
      }
      if (sortBy === "trending") {
        open.sort((a, b) => {
          const aScore = (a.total_votes_cached || 0) / Math.max(1, (new Date() - new Date(a.created_date)) / (1000 * 60 * 60));
          const bScore = (b.total_votes_cached || 0) / Math.max(1, (new Date() - new Date(b.created_date)) / (1000 * 60 * 60));
          return bScore - aScore;
        });
      } else if (sortBy === "new") {
        open.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      } else if (sortBy === "ending_soon") {
        open.sort((a, b) => new Date(a.end_time) - new Date(b.end_time));
      }
      return open;
    },
  });

  const { data: myVotes = [] } = useQuery({
    queryKey: ["my-votes", user?.id],
    queryFn: () => api.entities.Vote.filter({ user_id: user.id }),
    enabled: !!user,
  });
  const votedIds = new Set(myVotes.map(v => v.poll_id));

  if (isLoading) return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
    </div>
  );

  return (
    <div className="space-y-4">
      <Tabs value={sortBy} onValueChange={setSortBy}>
        <TabsList>
          <TabsTrigger value="trending"><TrendingUp className="w-3.5 h-3.5 mr-1.5" />Trending</TabsTrigger>
          <TabsTrigger value="new"><Sparkles className="w-3.5 h-3.5 mr-1.5" />Newest</TabsTrigger>
          <TabsTrigger value="ending_soon"><Clock className="w-3.5 h-3.5 mr-1.5" />Ending Soon</TabsTrigger>
        </TabsList>
      </Tabs>

      {polls.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <div className="text-4xl mb-3">🗳️</div>
          <p className="font-medium">No polls found</p>
          <p className="text-sm mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <VirtualFeed
          items={polls}
          columns={2}
          rowHeight={260}
          threshold={20}
          gridClassName="grid grid-cols-1 md:grid-cols-2 gap-4"
          renderItem={({ item: poll }) => (
            <PollCard
              poll={poll}
              hasVoted={votedIds.has(poll.id)}
              onClick={() => navigate(createPageUrl("PollDetail") + `?id=${poll.id}`)}
              currentUserId={user?.id}
            />
          )}
        />
      )}
    </div>
  );
}