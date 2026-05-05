import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { getAdminCommunityStats } from "@/api/communityApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Users, Shield, Lock } from "lucide-react";

export default function AdminCommunities() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        setLoading(false);
        return;
      }
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      if (["admin", "owner_admin"].includes(profile?.role)) {
        setIsAdmin(true);
        try {
          const data = await getAdminCommunityStats();
          setStats(data);
        } catch {
          setStats({ paying_communities: [], total_paying: 0, monthly_revenue: 0 });
        }
      }
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Community Revenue Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card className="border-slate-200">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">${stats?.monthly_revenue?.toFixed(2) || "0.00"}</p>
                <p className="text-xs text-slate-500">AUD (renewals, last 30 days)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats?.total_paying || 0}</p>
                <p className="text-xs text-slate-500">Paying communities</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 bg-purple-50 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">${((stats?.total_paying || 0) * 10.99).toFixed(2)}</p>
                <p className="text-xs text-slate-500">AUD projected monthly</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Paying Communities</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {!stats?.paying_communities?.length ? (
            <p className="text-center text-slate-400 py-8">No paying communities yet</p>
          ) : (
            <div className="space-y-2">
              {stats.paying_communities.map((community) => (
                <div key={community.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    {community.plan === "private" ? (
                      <Lock className="w-4 h-4 text-slate-500" />
                    ) : (
                      <Shield className="w-4 h-4 text-blue-500" />
                    )}
                    <div>
                      <p className="font-medium text-slate-800 text-sm">{community.name}</p>
                      <p className="text-xs text-slate-500">
                        {community.member_count ?? 0} members
                        {community.subscription_started_at
                          ? ` · Since ${new Date(community.subscription_started_at).toLocaleDateString()}`
                          : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={community.plan === "private" ? "bg-slate-100 text-slate-700" : "bg-blue-100 text-blue-700"}>
                      {community.plan}
                    </Badge>
                    <span className="text-sm font-semibold text-emerald-600">$10.99/mo</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
