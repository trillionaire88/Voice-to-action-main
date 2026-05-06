import { useState, useEffect } from "react";
import { api } from '@/api/client';
import { supabase } from "@/lib/supabase";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Settings, Users, BarChart3, Globe2, TrendingUp,
  Flag, CheckCircle2, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import BreachAlertPanel from "@/components/BreachAlertPanel";
import StripeConfigCheck from "@/components/payments/StripeConfigCheck";
import { SkeletonList } from "@/components/ui/SkeletonCard";
import SchemaValidator from "@/components/admin/SchemaValidator";

const PAGE_SIZE = 100;

export default function AdminDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const isAdmin = user?.role === "admin" || user?.role === "owner_admin";

  useEffect(() => {
    api.auth.me()
      .then(u => {
        const allowed = u.role === "admin" || u.role === "owner_admin";
        if (!allowed) { navigate(createPageUrl("Home")); return; }
        setUser(u);
      })
      .catch(() => navigate(createPageUrl("Home")))
      .finally(() => setLoading(false));
  }, []);

  const { data: allUsers = [] } = useQuery({
    queryKey: ["adminUsers", PAGE_SIZE],
    queryFn: () => api.entities.User.list("-created_date", PAGE_SIZE),
    enabled: !!user,
  });

  const { data: allPolls = [] } = useQuery({
    queryKey: ["adminPolls", PAGE_SIZE],
    queryFn: () => api.entities.Poll.list("-created_date", PAGE_SIZE),
    enabled: !!user,
  });

  const { data: allVotes = [] } = useQuery({
    queryKey: ["adminVotes", PAGE_SIZE],
    queryFn: () => api.entities.Vote.list("-created_date", PAGE_SIZE),
    enabled: !!user,
  });

  const { data: allReports = [] } = useQuery({
    queryKey: ["adminReports", PAGE_SIZE],
    queryFn: () => api.entities.Report.list("-created_date", PAGE_SIZE),
    enabled: !!user,
  });

  const { data: flaggedPetitions = [] } = useQuery({
    queryKey: ["flaggedPetitions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("petition_integrity")
        .select(`
          *,
          petitions ( id, title, signature_count_total, creator_user_id )
        `)
        .eq("is_flagged", true)
        .eq("admin_reviewed", false)
        .order("integrity_score", { ascending: true })
        .limit(20);
      if (error) {
        return [];
      }
      return data || [];
    },
    enabled: isAdmin,
  });

  if (loading) {
    return (
      <div className="py-8 sm:py-12">
        <SkeletonList count={8} />
      </div>
    );
  }

  const verifiedUsers = allUsers.filter(u => u.is_verified).length;
  const activePolls = allPolls.filter(p => p.status === "open").length;
  const closedPolls = allPolls.filter(p => p.status === "closed").length;
  const removedPolls = allPolls.filter(p => p.status === "removed").length;
  const openReports = allReports.filter(r => r.status === "open").length;
  const today = new Date().toDateString();
  const totalVotesToday = allVotes.filter(v => new Date(v.created_date).toDateString() === today).length;
  const countries = new Set(allUsers.map(u => u.country_code)).size;
  const verifiedVotes = allVotes.filter(v => v.is_verified_user).length;

  const statsCards = [
    { label: "Total Users", value: allUsers.length, sub: `${verifiedUsers} verified`, color: "blue", icon: Users },
    { label: "Total Polls", value: allPolls.length, sub: `${activePolls} active, ${closedPolls} closed`, color: "purple", icon: BarChart3 },
    { label: "Total Votes", value: allVotes.length, sub: `${verifiedVotes} verified votes`, color: "green", icon: CheckCircle2 },
    { label: "Open Reports", value: openReports, sub: `${allReports.length} total reports`, color: "orange", icon: Flag },
    { label: "Countries", value: countries, sub: "represented globally", color: "cyan", icon: Globe2 },
    { label: "Today's Votes", value: totalVotesToday, sub: "votes cast today", color: "indigo", icon: TrendingUp },
    { label: "Removed Polls", value: removedPolls, sub: "by moderation", color: "red", icon: AlertTriangle },
    { label: "Avg Votes/Poll", value: allPolls.length > 0 ? (allVotes.length / allPolls.length).toFixed(1) : 0, sub: "engagement metric", color: "slate", icon: BarChart3 },
  ];

  const colorMap = {
    blue:   { border: "border-blue-200",   bg: "bg-gradient-to-br from-blue-50 to-white",   val: "text-blue-700",   sub: "text-blue-600",   head: "text-blue-900" },
    purple: { border: "border-purple-200", bg: "bg-gradient-to-br from-purple-50 to-white", val: "text-purple-700", sub: "text-purple-600", head: "text-purple-900" },
    green:  { border: "border-green-200",  bg: "bg-gradient-to-br from-green-50 to-white",  val: "text-green-700",  sub: "text-green-600",  head: "text-green-900" },
    orange: { border: "border-orange-200", bg: "bg-gradient-to-br from-orange-50 to-white", val: "text-orange-700", sub: "text-orange-600", head: "text-orange-900" },
    cyan:   { border: "border-cyan-200",   bg: "bg-gradient-to-br from-cyan-50 to-white",   val: "text-cyan-700",   sub: "text-cyan-600",   head: "text-cyan-900" },
    indigo: { border: "border-indigo-200", bg: "bg-gradient-to-br from-indigo-50 to-white", val: "text-indigo-700", sub: "text-indigo-600", head: "text-indigo-900" },
    red:    { border: "border-red-200",    bg: "bg-gradient-to-br from-red-50 to-white",    val: "text-red-700",    sub: "text-red-600",    head: "text-red-900" },
    slate:  { border: "border-slate-200",  bg: "bg-gradient-to-br from-slate-50 to-white",  val: "text-slate-700",  sub: "text-slate-600",  head: "text-slate-900" },
  };

  const healthItems = [
    {
      label: "User Verification Rate",
      desc: "Percentage of users who completed verification",
      value: allUsers.length > 0 ? ((verifiedUsers / allUsers.length) * 100).toFixed(1) + "%" : "0%",
      color: "text-emerald-600",
    },
    {
      label: "Vote Trust Score",
      desc: "Percentage of votes from verified users",
      value: allVotes.length > 0 ? ((verifiedVotes / allVotes.length) * 100).toFixed(1) + "%" : "0%",
      color: "text-blue-600",
    },
    {
      label: "Report Rate",
      desc: "Reports per 100 polls (lower is better)",
      value: allPolls.length > 0 ? ((allReports.length / allPolls.length) * 100).toFixed(1) : "0",
      color: "text-orange-600",
    },
  ];

  return (
    <div className="py-4 sm:py-8">
      {/* Header */}
      <div className="mb-8 flex items-center gap-3">
        <div className="bg-gradient-to-br from-purple-600 to-purple-700 p-2.5 rounded-xl flex-shrink-0">
          <Settings className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="text-slate-600 text-sm">Platform analytics and insights</p>
        </div>
      </div>

      <SchemaValidator />

      {flaggedPetitions.length > 0 && (
        <Card className="border-amber-200 bg-amber-50 mb-8">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-amber-800">
              <AlertTriangle className="w-4 h-4" />
              {flaggedPetitions.length} Petition{flaggedPetitions.length > 1 ? "s" : ""} Flagged for Integrity Review
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {flaggedPetitions.map((item) => {
              const p = item.petitions;
              const flags = Array.isArray(item.flags) ? item.flags : [];
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2 bg-white rounded-lg border border-amber-200 gap-2 flex-wrap"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{p?.title || "Unknown"}</p>
                    <p className="text-xs text-slate-500">
                      Score: {item.integrity_score}/100 · Flags: {flags.join(", ") || "—"}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs shrink-0"
                    onClick={async () => {
                      await supabase.from("petition_integrity").update({ admin_reviewed: true }).eq("id", item.id);
                      queryClient.invalidateQueries({ queryKey: ["flaggedPetitions"] });
                    }}
                  >
                    Mark Reviewed
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 mb-8">
        {statsCards.map(({ label, value, sub, color, icon: StatIcon }) => {
          const c = colorMap[color];
          return (
            <Card key={label} className={`${c.border} ${c.bg}`}>
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className={`text-xs sm:text-sm font-medium ${c.head} leading-tight`}>{label}</CardTitle>
                  <StatIcon className={`w-4 h-4 ${c.val} flex-shrink-0`} />
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className={`text-2xl sm:text-3xl font-bold ${c.val}`}>{value}</div>
                <p className={`text-[11px] sm:text-xs ${c.sub} mt-1`}>{sub}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Platform Health — unified responsive layout */}
      <div className="mb-8">
        <BreachAlertPanel />
      </div>
      <div className="mb-8">
        <StripeConfigCheck />
      </div>
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Platform Health</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {healthItems.map((item, i) => (
            <div
              key={item.label}
              className={`flex items-center justify-between px-4 sm:px-6 py-4 ${i < healthItems.length - 1 ? "border-b border-slate-100" : ""}`}
            >
              <div className="flex-1 min-w-0 pr-4">
                <h4 className="font-semibold text-slate-900 text-sm sm:text-base">{item.label}</h4>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">{item.desc}</p>
              </div>
              <div className={`text-xl sm:text-2xl font-bold ${item.color} flex-shrink-0`}>{item.value}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}