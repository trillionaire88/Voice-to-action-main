import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, BarChart3, CheckCircle2, TrendingUp, Globe2, Shield } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

function normalizeRpcPayload(raw) {
  if (!raw || typeof raw !== "object") return null;
  return {
    totalUsers: Number(raw.total_users) || 0,
    verifiedUsers: Number(raw.verified_users) || 0,
    uniqueCountries: Number(raw.unique_countries) || 0,
    totalPolls: Number(raw.total_polls) || 0,
    activePolls: Number(raw.active_polls) || 0,
    totalVotes: Number(raw.total_votes) || 0,
    totalCommunities: Number(raw.total_communities) || 0,
    recentVotes24h: Number(raw.votes_24h) || 0,
    recentPolls24h: Number(raw.polls_24h) || 0,
    recentPolls7d: Number(raw.polls_7d) || 0,
  };
}

async function fetchStatsViaCounts() {
  const day = new Date(Date.now() - 86400000).toISOString();
  const week = new Date(Date.now() - 7 * 86400000).toISOString();

  const countHead = (q) => q.select("*", { count: "exact", head: true });

  const [
    usersRes,
    verifiedRes,
    pollsRes,
    activePollsRes,
    votesRes,
    communitiesRes,
    polls24Res,
    polls7Res,
    votes24Res,
  ] = await Promise.all([
    countHead(supabase.from("public_profiles_view")),
    countHead(supabase.from("public_profiles_view").eq("is_blue_verified", true)),
    countHead(supabase.from("polls")),
    countHead(supabase.from("polls").eq("status", "open")),
    countHead(supabase.from("votes")),
    countHead(supabase.from("communities")),
    countHead(supabase.from("polls").gte("created_date", day)),
    countHead(supabase.from("polls").gte("created_date", week)),
    countHead(supabase.from("votes").gte("created_at", day)),
  ]);

  const polls24Fallback =
    typeof polls24Res.count === "number"
      ? polls24Res.count
      : (await countHead(supabase.from("polls").gte("start_time", day))).count ?? 0;

  return {
    totalUsers: usersRes.count ?? 0,
    verifiedUsers: verifiedRes.count ?? 0,
    uniqueCountries: 0,
    totalPolls: pollsRes.count ?? 0,
    activePolls: activePollsRes.count ?? 0,
    totalVotes: votesRes.count ?? 0,
    totalCommunities: communitiesRes.count ?? 0,
    recentVotes24h: votes24Res.count ?? 0,
    recentPolls24h: polls24Fallback,
    recentPolls7d: polls7Res.count ?? 0,
  };
}

export default function PlatformStats() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["platformStatsSummary"],
    queryFn: async () => {
      const { data: rpcData, error } = await supabase.rpc("platform_stats_public_summary");
      if (!error && rpcData) {
        const n = normalizeRpcPayload(rpcData);
        if (n) return n;
      }
      return fetchStatsViaCounts();
    },
    staleTime: 5 * 60_000,
  });

  const loading = isLoading || !stats;

  const recentPolls24h = stats?.recentPolls24h ?? 0;
  const recentPolls7d = stats?.recentPolls7d ?? 0;
  const recentVotes24h = stats?.recentVotes24h ?? 0;

  const statsView = stats ?? {
    totalUsers: 0,
    verifiedUsers: 0,
    uniqueCountries: 0,
    totalPolls: 0,
    activePolls: 0,
    totalVotes: 0,
    totalCommunities: 0,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-2.5 rounded-xl">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Platform Statistics</h1>
            <p className="text-slate-600">
              Public, aggregated metrics about Voice to Action activity
            </p>
          </div>
        </div>
        <Badge className="bg-blue-50 text-blue-700 border-blue-200">
          Privacy-safe • No personal data exposed
        </Badge>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : (
        <>
          {/* Overall Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="border-slate-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Total Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">{statsView.totalUsers.toLocaleString()}</div>
                <p className="text-xs text-slate-500 mt-1">
                  {statsView.verifiedUsers.toLocaleString()} verified
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Total Polls
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">{statsView.totalPolls.toLocaleString()}</div>
                <p className="text-xs text-slate-500 mt-1">
                  {statsView.activePolls.toLocaleString()} currently active
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Total Votes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">{statsView.totalVotes.toLocaleString()}</div>
                <p className="text-xs text-slate-500 mt-1">
                  {recentVotes24h.toLocaleString()} in last 24h
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                  <Globe2 className="w-4 h-4" />
                  Countries
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">
                  {statsView.uniqueCountries > 0 ? statsView.uniqueCountries : "—"}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Global representation
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Community Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="border-slate-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Comments
                </CardTitle>
              </CardHeader>
              <CardContent>
                  <div className="text-3xl font-bold text-slate-900">Coming soon</div>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Communities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">{statsView.totalCommunities.toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Verification Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">
                  {statsView.totalUsers > 0 ? Math.round((statsView.verifiedUsers / statsView.totalUsers) * 100) : 0}%
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Activity Stats */}
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <div className="text-sm text-slate-600 mb-1">Last 24 Hours</div>
                  <div className="text-2xl font-bold text-slate-900">{recentPolls24h}</div>
                  <div className="text-xs text-slate-500">new polls</div>
                </div>
                <div>
                  <div className="text-sm text-slate-600 mb-1">Last 7 Days</div>
                  <div className="text-2xl font-bold text-slate-900">{recentPolls7d}</div>
                  <div className="text-xs text-slate-500">new polls</div>
                </div>
                <div>
                  <div className="text-sm text-slate-600 mb-1">Avg Votes per Poll</div>
                  <div className="text-2xl font-bold text-slate-900">
                    {statsView.totalPolls > 0 ? Math.round(statsView.totalVotes / statsView.totalPolls) : 0}
                  </div>
                  <div className="text-xs text-slate-500">votes</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transparency Note */}
          <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">About These Statistics</h3>
                <p className="text-sm text-blue-800 leading-relaxed">
                  All statistics are aggregated and anonymized to protect user privacy. No individual user data,
                  voting patterns, or personally identifiable information is exposed through this dashboard. These
                  metrics are provided for transparency and research purposes.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
