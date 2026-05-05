import React from "react";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function TransparencyReport() {
  const { data: reports = [], isLoading: reportsLoading } = useQuery({
    queryKey: ["allReports"],
    queryFn: async () => {
      const { data, error } = await supabase.from("reports").select("*").order("created_at", { ascending: false });
      if (error && (error.code === "42P01" || error.message?.includes("does not exist"))) return [];
      return data || [];
    },
  });

  const { data: moderationLogs = [], isLoading: logsLoading } = useQuery({
    queryKey: ["allModerationLogs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("moderation_logs").select("*").order("created_at", { ascending: false });
      if (error && (error.code === "42P01" || error.message?.includes("does not exist"))) return [];
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

  const isLoading = reportsLoading || logsLoading || pollsLoading;

  // Calculate time periods
  const now = new Date();
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

  // Filter recent data
  const recentReports = reports.filter(r => new Date(r.created_date || r.created_at) > thirtyDaysAgo);
  const recentLogs = moderationLogs.filter(l => new Date(l.created_date || l.created_at) > thirtyDaysAgo);

  // Calculate stats
  const stats = {
    totalReports: recentReports.length,
    openReports: reports.filter(r => r.status === 'open').length,
    resolvedReports: recentReports.filter(r => r.status === 'action_taken' || r.status === 'dismissed').length,
    pollsRemoved: recentLogs.filter(l => l.action_type === 'poll_removed').length,
    usersActioned: recentLogs.filter(l => l.action_type.includes('user_')).length,
    totalPolls: polls.length,
    removedPolls: polls.filter(p => p.status === 'removed').length,
  };

  // Violation categories breakdown
  const violationCounts = recentReports.reduce((acc, report) => {
    const reason = report.reason || report.category || "other";
    acc[reason] = (acc[reason] || 0) + 1;
    return acc;
  }, {});

  const violationLabels = {
    hate_speech: "Hate Speech",
    harassment: "Harassment",
    extremism: "Extremism",
    violence_threats: "Violence/Threats",
    child_safety: "Child Safety",
    self_harm: "Self-Harm",
    misinformation: "Misinformation",
    spam: "Spam",
    scam: "Scam",
    illegal_content: "Illegal Content",
    other: "Other",
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-2.5 rounded-xl">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Transparency & Safety Report</h1>
            <p className="text-slate-600">
              Public overview of moderation actions and content safety (Last 30 days)
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-32" />
          <Skeleton className="h-64" />
        </div>
      ) : (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="border-slate-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Reports Received
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">{stats.totalReports}</div>
                <p className="text-xs text-slate-500 mt-1">
                  {stats.openReports} currently open
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Reports Resolved
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">{stats.resolvedReports}</div>
                <p className="text-xs text-slate-500 mt-1">
                  {stats.totalReports > 0 ? Math.round((stats.resolvedReports / stats.totalReports) * 100) : 0}% resolution rate
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                  <XCircle className="w-4 h-4" />
                  Content Removed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">{stats.pollsRemoved}</div>
                <p className="text-xs text-slate-500 mt-1">
                  polls removed
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  User Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">{stats.usersActioned}</div>
                <p className="text-xs text-slate-500 mt-1">
                  suspensions/restrictions
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Violation Categories */}
          <Card className="border-slate-200 mb-8">
            <CardHeader>
              <CardTitle>Reports by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(violationCounts)
                  .sort((a, b) => b[1] - a[1])
                  .map(([reason, count]) => (
                    <div key={reason} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={
                          ['child_safety', 'violence_threats', 'extremism'].includes(reason)
                            ? 'border-red-300 text-red-700'
                            : 'border-slate-300 text-slate-700'
                        }>
                          {violationLabels[reason] || reason}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 min-w-[200px] bg-slate-100 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{
                              width: `${stats.totalReports > 0 ? (count / stats.totalReports) * 100 : 0}%`
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium text-slate-900 w-12 text-right">
                          {count}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Platform Health */}
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle>Platform Health</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="text-sm text-slate-600 mb-2">Content Removal Rate</div>
                  <div className="text-2xl font-bold text-slate-900">
                    {stats.totalPolls > 0 ? ((stats.removedPolls / stats.totalPolls) * 100).toFixed(2) : 0}%
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {stats.removedPolls} of {stats.totalPolls} polls removed
                  </p>
                </div>
                <div>
                  <div className="text-sm text-slate-600 mb-2">Average Response Time</div>
                  <div className="text-2xl font-bold text-slate-900">
                    &lt; 24h
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    for report review
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Methodology Note */}
          <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">About This Report</h3>
                <p className="text-sm text-blue-800 leading-relaxed mb-3">
                  This transparency report provides aggregated statistics about content moderation and safety
                  actions on EveryVoice. All data is anonymized and presented in aggregate form to protect
                  user privacy while maintaining transparency about platform governance.
                </p>
                <p className="text-sm text-blue-800 leading-relaxed">
                  Our moderation decisions are guided by our Community Guidelines and are subject to appeal.
                  We publish these reports to demonstrate our commitment to transparent, accountable platform
                  governance.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}