import React from "react";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, BarChart3, CheckCircle2, TrendingUp, Globe2, Shield } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function PlatformStats() {
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["allUsers"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*");
      return data || [];
    },
  });

  const { data: polls = [], isLoading: pollsLoading } = useQuery({
    queryKey: ["allPolls"],
    queryFn: async () => {
      const { data } = await supabase.from("polls").select("*");
      return data || [];
    },
  });

  const { data: votes = [], isLoading: votesLoading } = useQuery({
    queryKey: ["allVotes"],
    queryFn: async () => {
      const { data } = await supabase.from("votes").select("*");
      return data || [];
    },
  });

  const { data: communities = [], isLoading: communitiesLoading } = useQuery({
    queryKey: ["allCommunities"],
    queryFn: async () => {
      const { data } = await supabase.from("communities").select("*");
      return data || [];
    },
  });

  const isLoading = usersLoading || pollsLoading || votesLoading || communitiesLoading;

  // Calculate statistics
  const stats = {
    totalUsers: users.length,
    verifiedUsers: users.filter(u => u.is_verified).length,
    totalPolls: polls.length,
    activePolls: polls.filter(p => p.status === 'open').length,
    totalVotes: votes.length,
    totalComments: 0,
    totalCommunities: communities.length,
    uniqueCountries: new Set(users.map(u => u.country_code).filter(Boolean)).size,
  };

  // Time-based stats
  const now = new Date();
  const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

  const recentPolls24h = polls.filter(p => new Date(p.created_date || p.created_at) > oneDayAgo).length;
  const recentPolls7d = polls.filter(p => new Date(p.created_date || p.created_at) > sevenDaysAgo).length;
  const recentVotes24h = votes.filter(v => new Date(v.created_date || v.created_at) > oneDayAgo).length;

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

      {isLoading ? (
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
                <div className="text-3xl font-bold text-slate-900">{stats.totalUsers.toLocaleString()}</div>
                <p className="text-xs text-slate-500 mt-1">
                  {stats.verifiedUsers.toLocaleString()} verified
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
                <div className="text-3xl font-bold text-slate-900">{stats.totalPolls.toLocaleString()}</div>
                <p className="text-xs text-slate-500 mt-1">
                  {stats.activePolls.toLocaleString()} currently active
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
                <div className="text-3xl font-bold text-slate-900">{stats.totalVotes.toLocaleString()}</div>
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
                <div className="text-3xl font-bold text-slate-900">{stats.uniqueCountries}</div>
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
                <div className="text-3xl font-bold text-slate-900">{stats.totalCommunities.toLocaleString()}</div>
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
                  {stats.totalUsers > 0 ? Math.round((stats.verifiedUsers / stats.totalUsers) * 100) : 0}%
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
                    {stats.totalPolls > 0 ? Math.round(stats.totalVotes / stats.totalPolls) : 0}
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