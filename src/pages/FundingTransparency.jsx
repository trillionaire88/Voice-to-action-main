import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Eye,
  TrendingUp,
  DollarSign,
  Users,
  Calendar,
  BarChart3,
  Shield,
  Database,
  Globe2,
  Lock,
  FileText,
  CheckCircle2,
} from "lucide-react";

export default function FundingTransparency() {
  const navigate = useNavigate();
  const [, setUser] = useState(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      setUser(authUser || null);
    } catch {
      setUser(null);
    }
  };

  const { data: donations = [] } = useQuery({
    queryKey: ["platformDonations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("platform_donations").select("*").eq("status", "completed");
      if (error && (error.code === "42P01" || error.message?.includes("does not exist"))) return [];
      return data || [];
    },
  });

  const { data: allocations = [], isLoading: allocationsLoading } = useQuery({
    queryKey: ["fundingAllocations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("funding_allocations")
        .select("*")
        .eq("is_published", true)
        .order("created_at", { ascending: false });
      if (error && (error.code === "42P01" || error.message?.includes("does not exist"))) return [];
      return data || [];
    },
  });

  const totalRaised = donations.reduce((sum, d) => sum + (d.amount || 0), 0);
  const activeSupporters = new Set(donations.map((d) => d.donor_user_id)).size;
  const recurringDonors = donations.filter((d) => d.is_recurring).length;

  const latestAllocation = allocations[0] || null;

  const calculateCategoryTotal = (category) => {
    if (!latestAllocation) return 0;
    return latestAllocation[category] || 0;
  };

  const totalSpent = latestAllocation
    ? calculateCategoryTotal("platform_development") +
      calculateCategoryTotal("infrastructure") +
      calculateCategoryTotal("security_trust") +
      calculateCategoryTotal("legal_compliance") +
      calculateCategoryTotal("operations") +
      calculateCategoryTotal("global_expansion") +
      calculateCategoryTotal("research_analytics") +
      calculateCategoryTotal("accessibility")
    : 0;

  const expenditureCategories = [
    { key: "platform_development", label: "Platform Development", icon: FileText, color: "blue" },
    { key: "infrastructure", label: "Infrastructure", icon: Database, color: "purple" },
    { key: "security_trust", label: "Security & Trust", icon: Shield, color: "green" },
    { key: "legal_compliance", label: "Legal & Compliance", icon: Lock, color: "amber" },
    { key: "operations", label: "Operations", icon: BarChart3, color: "slate" },
    { key: "global_expansion", label: "Global Expansion", icon: Globe2, color: "indigo" },
    { key: "research_analytics", label: "Research & Analytics", icon: TrendingUp, color: "cyan" },
    { key: "accessibility", label: "Accessibility", icon: Users, color: "pink" },
  ];

  return (
    <div className="pb-16">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center max-w-3xl mx-auto">
            <Eye className="w-16 h-16 text-blue-300 mx-auto mb-6" />
            <h1 className="text-4xl sm:text-5xl font-bold mb-6">
              Platform Funding Transparency
            </h1>
            <p className="text-xl text-blue-100">
              Complete visibility into how Every Voice is funded and how resources are allocated.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Trust Alert */}
        <Alert className="border-blue-200 bg-blue-50 mb-8">
          <CheckCircle2 className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900">
            <strong>Transparency Commitment:</strong> All funding data is permanently archived and publicly accessible. 
            Donations never influence platform decisions, votes, or content visibility.
          </AlertDescription>
        </Alert>

        {/* Aggregated Metrics */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="border-slate-200">
            <CardContent className="pt-6">
              <DollarSign className="w-8 h-8 text-green-600 mb-2" />
              <div className="text-3xl font-bold text-slate-900 mb-1">
                ${totalRaised.toLocaleString()}
              </div>
              <div className="text-sm text-slate-600">Total Funds Raised</div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="pt-6">
              <Users className="w-8 h-8 text-blue-600 mb-2" />
              <div className="text-3xl font-bold text-slate-900 mb-1">
                {activeSupporters}
              </div>
              <div className="text-sm text-slate-600">Active Supporters</div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="pt-6">
              <TrendingUp className="w-8 h-8 text-purple-600 mb-2" />
              <div className="text-3xl font-bold text-slate-900 mb-1">
                {recurringDonors}
              </div>
              <div className="text-sm text-slate-600">Recurring Supporters</div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="pt-6">
              <Calendar className="w-8 h-8 text-amber-600 mb-2" />
              <div className="text-3xl font-bold text-slate-900 mb-1">
                {allocations.length}
              </div>
              <div className="text-sm text-slate-600">Published Reports</div>
            </CardContent>
          </Card>
        </div>

        {/* Expenditure Breakdown */}
        <Card className="border-slate-200 mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Expenditure Reporting
            </CardTitle>
          </CardHeader>
          <CardContent>
            {allocationsLoading ? (
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : !latestAllocation ? (
              <div className="text-center py-12 text-slate-600">
                <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <p>No expenditure reports published yet</p>
                <p className="text-sm">Reports will be published regularly as funds are allocated</p>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-600">
                      Reporting Period: {new Date(latestAllocation.period_start).toLocaleDateString()} 
                      {" - "}
                      {new Date(latestAllocation.period_end).toLocaleDateString()}
                    </span>
                    <Badge className="bg-green-50 text-green-700">
                      ${totalSpent.toLocaleString()} allocated
                    </Badge>
                  </div>
                  <Progress value={(totalSpent / totalRaised) * 100} className="h-2" />
                </div>

                <div className="space-y-4">
                  {expenditureCategories.map((category) => {
                    const amount = calculateCategoryTotal(category.key);
                    const percentage = totalSpent > 0 ? (amount / totalSpent) * 100 : 0;
                    const Icon = category.icon;

                    return (
                      <div key={category.key} className="border-l-4 border-slate-200 pl-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Icon className={`w-4 h-4 text-${category.color}-600`} />
                            <span className="font-medium text-slate-900">{category.label}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-slate-600">{percentage.toFixed(1)}%</span>
                            <span className="font-bold text-slate-900">
                              ${amount.toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    );
                  })}
                </div>

                {latestAllocation.notes && (
                  <Alert className="border-slate-200 mt-6">
                    <FileText className="h-4 w-4" />
                    <AlertDescription className="text-slate-700 text-sm">
                      <strong>Notes:</strong> {latestAllocation.notes}
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Support Action */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6 text-center">
            <h3 className="text-xl font-bold text-slate-900 mb-3">
              Support Platform Development
            </h3>
            <p className="text-slate-700 mb-6 max-w-2xl mx-auto">
              Help maintain Every Voice as an independent, transparent platform for global civic engagement.
            </p>
            <Button
              onClick={() => navigate(createPageUrl("PlatformFunding"))}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Make a Contribution
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}