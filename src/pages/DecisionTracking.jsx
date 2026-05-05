import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  TrendingUp,
  FileCheck,
  Building2,
} from "lucide-react";
import { format } from "date-fns";

export default function DecisionTracking() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      setUser(authUser || null);
    } catch (error) {
      setUser(null);
    }
  };

  const { data: decisions = [] } = useQuery({
    queryKey: ["decisionOutcomes", filterStatus],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("decision_outcomes")
        .select("*")
        .order("promise_date", { ascending: false });
      if (error && (error.code === "42P01" || error.message?.includes("does not exist"))) return [];
      const all = data || [];
      if (filterStatus === "all") return all;
      return all.filter((d) => d.status === filterStatus);
    },
  });

  const { data: institutions = [] } = useQuery({
    queryKey: ["institutions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("institutions").select("*");
      if (error && (error.code === "42P01" || error.message?.includes("does not exist"))) return [];
      return data || [];
    },
  });

  const getStatusConfig = (status) => {
    const configs = {
      promised: { icon: Clock, color: "blue", label: "Promised" },
      in_progress: { icon: TrendingUp, color: "yellow", label: "In Progress" },
      delivered: { icon: CheckCircle2, color: "green", label: "Delivered" },
      partially_delivered: { icon: AlertCircle, color: "orange", label: "Partially Delivered" },
      failed: { icon: XCircle, color: "red", label: "Failed" },
      abandoned: { icon: XCircle, color: "slate", label: "Abandoned" },
    };
    return configs[status] || configs.promised;
  };

  const stats = {
    total: decisions.length,
    delivered: decisions.filter((d) => d.status === "delivered").length,
    inProgress: decisions.filter((d) => d.status === "in_progress").length,
    failed: decisions.filter((d) => d.status === "failed" || d.status === "abandoned").length,
  };

  const deliveryRate = stats.total > 0 ? Math.round((stats.delivered / stats.total) * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
          <FileCheck className="w-8 h-8 text-blue-600" />
          Decision Outcome Tracking
        </h1>
        <p className="text-slate-600">
          Permanent public records of institutional promises and their delivery
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
              <p className="text-sm text-slate-600 mt-1">Total Decisions</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">{stats.delivered}</p>
              <p className="text-sm text-slate-600 mt-1">Delivered</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-yellow-600">{stats.inProgress}</p>
              <p className="text-sm text-slate-600 mt-1">In Progress</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">{deliveryRate}%</p>
              <p className="text-sm text-slate-600 mt-1">Delivery Rate</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Tabs value={filterStatus} onValueChange={setFilterStatus} className="mb-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="promised">Promised</TabsTrigger>
          <TabsTrigger value="in_progress">In Progress</TabsTrigger>
          <TabsTrigger value="delivered">Delivered</TabsTrigger>
          <TabsTrigger value="partially_delivered">Partial</TabsTrigger>
          <TabsTrigger value="failed">Failed</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Decisions List */}
      <div className="space-y-4">
        {decisions.map((decision) => {
          const institution = institutions.find((i) => i.id === decision.institution_id);
          const config = getStatusConfig(decision.status);
          const Icon = config.icon;

          return (
            <Card key={decision.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={`bg-${config.color}-50 text-${config.color}-700 border-${config.color}-200`}>
                        <Icon className="w-3 h-3 mr-1" />
                        {config.label}
                      </Badge>
                      {decision.verified_by_admin && (
                        <Badge className="bg-emerald-50 text-emerald-700">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Verified
                        </Badge>
                      )}
                      {decision.immutable && (
                        <Badge className="bg-slate-100 text-slate-700">Immutable</Badge>
                      )}
                    </div>
                    <CardTitle className="text-xl mb-2">{decision.decision_title}</CardTitle>
                    {institution && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Building2 className="w-4 h-4" />
                        <span>{institution.name}</span>
                      </div>
                    )}
                  </div>
                  {decision.accountability_score !== undefined && (
                    <div className="text-center">
                      <p className="text-2xl font-bold text-slate-900">
                        {Math.round(decision.accountability_score)}%
                      </p>
                      <p className="text-xs text-slate-600">Accountability</p>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 mb-1">Promised Outcome:</p>
                    <p className="text-sm text-slate-700">{decision.promised_outcome}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {format(new Date(decision.promise_date), "MMM d, yyyy")}
                    </p>
                  </div>
                  {decision.actual_outcome && (
                    <div>
                      <p className="text-sm font-semibold text-slate-900 mb-1">Actual Outcome:</p>
                      <p className="text-sm text-slate-700">{decision.actual_outcome}</p>
                      {decision.delivery_date && (
                        <p className="text-xs text-slate-500 mt-1">
                          {format(new Date(decision.delivery_date), "MMM d, yyyy")}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {decision.public_satisfaction_score !== undefined && (
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-700">Public Satisfaction</span>
                      <span className="font-semibold">{Math.round(decision.public_satisfaction_score)}%</span>
                    </div>
                    <Progress value={decision.public_satisfaction_score} />
                    <p className="text-xs text-slate-500 mt-1">
                      {decision.satisfaction_vote_count} votes
                    </p>
                  </div>
                )}

                {decision.poll_id && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(createPageUrl("PollDetail") + `?id=${decision.poll_id}`)}
                  >
                    View Related Poll
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}

        {decisions.length === 0 && (
          <Card className="p-12 text-center">
            <FileCheck className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600">No decisions found matching this filter</p>
          </Card>
        )}
      </div>
    </div>
  );
}