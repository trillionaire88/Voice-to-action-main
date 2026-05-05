import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  TrendingUp,
  Clock,
  Target,
  Users,
  Shield,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import CongressPetitionCard from "@/components/congress/CongressPetitionCard";

const CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "government_policy", label: "Government Policy" },
  { value: "local_council", label: "Local Council" },
  { value: "corporate_policy", label: "Corporate Policy" },
  { value: "human_rights", label: "Human Rights" },
  { value: "environment", label: "Environment" },
  { value: "health", label: "Health" },
  { value: "economy", label: "Economy" },
  { value: "technology", label: "Technology" },
  { value: "education", label: "Education" },
  { value: "housing", label: "Housing" },
  { value: "justice", label: "Justice" },
  { value: "disability", label: "Disability Rights" },
  { value: "indigenous_rights", label: "Indigenous Rights" },
  { value: "immigration", label: "Immigration" },
  { value: "consumer_rights", label: "Consumer Rights" },
];

export default function CongressDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [userLoading, setUserLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [trackedPetitionIds, setTrackedPetitionIds] = useState(new Set());

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) {
        setUser(null);
      } else {
        const { data: profile } = await supabase.from("profiles").select("*").eq("id", authUser.id).maybeSingle();
        setUser({ ...authUser, ...(profile || {}) });
      }
    } catch (error) {
      setUser(null);
    } finally {
      setUserLoading(false);
    }
  };

  const { data: allPetitions = [], isLoading } = useQuery({
    queryKey: ["congressPetitions"],
    queryFn: async () => {
      const { data } = await supabase.from("petitions").select("*").order("created_at", { ascending: false });
      return (data || []).filter(p => p.status === 'active' || p.status === 'delivered');
    },
  });

  const { data: trackedPetitions = [] } = useQuery({
    queryKey: ["trackedPetitions", user?.id],
    queryFn: async () => {
      return [];
    },
    enabled: !!user,
  });

  useEffect(() => {
    setTrackedPetitionIds(new Set(trackedPetitions.map(t => t.petition_id)));
  }, [trackedPetitions]);

  const filteredPetitions = allPetitions
    .filter(p => {
      if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        p.title.toLowerCase().includes(query) ||
        p.target_name.toLowerCase().includes(query) ||
        p.country_code?.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  const activePetitions = filteredPetitions.filter(p => p.status === 'active');
  const deliveredPetitions = filteredPetitions.filter(p => p.status === 'delivered');
  const highImpactPetitions = allPetitions
    .filter(p => p.signature_count_verified >= 10000)
    .sort((a, b) => b.signature_count_verified - a.signature_count_verified)
    .slice(0, 5);

  if (userLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Skeleton className="h-32 w-full mb-6" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Alert className="bg-amber-50 border-amber-200">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription className="text-amber-800">
            This portal is restricted to Congress members and authorized organization viewers. Contact support for access.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold text-slate-900">Congress Member Portal</h1>
          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
            <Shield className="w-3 h-3 mr-1" />
            {user?.role === 'congress_member' ? 'Congress Member' : 'Organization Viewer'}
          </Badge>
        </div>
        <p className="text-slate-600">
          Track petitions, view signer demographics, and monitor public opinion in real-time
        </p>
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-slate-900">{allPetitions.length}</div>
            <p className="text-sm text-slate-600">Active Petitions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-slate-900">{trackedPetitionIds.size}</div>
            <p className="text-sm text-slate-600">Tracked</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-emerald-600">{deliveredPetitions.length}</div>
            <p className="text-sm text-slate-600">Delivered</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-slate-900">
              {allPetitions.reduce((sum, p) => sum + (p.signature_count_verified || 0), 0).toLocaleString()}
            </div>
            <p className="text-sm text-slate-600">Verified Signatures</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="tracked" className="mb-8">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tracked">
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Tracked ({trackedPetitionIds.size})
          </TabsTrigger>
          <TabsTrigger value="active">
            <AlertCircle className="w-4 h-4 mr-2" />
            Active ({activePetitions.length})
          </TabsTrigger>
          <TabsTrigger value="impact">
            <TrendingUp className="w-4 h-4 mr-2" />
            High Impact
          </TabsTrigger>
        </TabsList>

        {/* Tracked Petitions */}
        <TabsContent value="tracked">
          <div className="space-y-4">
            <Card className="border-slate-200 p-6 mb-6">
              <div className="flex flex-col md:flex-row gap-4 mb-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    placeholder="Search tracked petitions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full md:w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </Card>

            {trackedPetitionIds.size === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Target className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">No Tracked Petitions</h3>
                  <p className="text-slate-600 mb-6">Start tracking petitions to monitor their progress</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredPetitions
                  .filter(p => trackedPetitionIds.has(p.id))
                  .map(petition => (
                    <CongressPetitionCard
                      key={petition.id}
                      petition={petition}
                      isTracked={true}
                      onTrackChange={() => {}}
                    />
                  ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Browse Active Petitions */}
        <TabsContent value="active">
          <div className="space-y-4">
            <Card className="border-slate-200 p-6 mb-6">
              <div className="flex flex-col md:flex-row gap-4 mb-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    placeholder="Search active petitions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full md:w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </Card>

            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-48" />
                ))}
              </div>
            ) : activePetitions.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">No Active Petitions</h3>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {activePetitions.map(petition => (
                  <CongressPetitionCard
                    key={petition.id}
                    petition={petition}
                    isTracked={trackedPetitionIds.has(petition.id)}
                    onTrackChange={() => {}}
                  />
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* High Impact Petitions */}
        <TabsContent value="impact">
          <div className="space-y-4">
            {highImpactPetitions.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <TrendingUp className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">No High Impact Petitions</h3>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {highImpactPetitions.map(petition => (
                  <CongressPetitionCard
                    key={petition.id}
                    petition={petition}
                    isTracked={trackedPetitionIds.has(petition.id)}
                    onTrackChange={() => {}}
                    highlight
                  />
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}