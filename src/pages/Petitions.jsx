import React, { useState, useEffect } from "react";
import { api } from '@/api/client';
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import PullToRefresh from "@/components/ui/PullToRefresh";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import MobileSelect from "@/components/ui/MobileSelect";
import {
  FileText,
  Search,
  Plus,
  TrendingUp,
  Clock,
  Target,
  Users,
  AlertCircle,
  Shield,
} from "lucide-react";
import PetitionCard from "../components/petitions/PetitionCard";
import { SkeletonCardGrid } from "@/components/ui/SkeletonCard";
import EmptyState from "@/components/ui/EmptyState";
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
  { value: "other", label: "Other" },
];

export default function Petitions() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("most_signatures");
  const [visibleCount, setVisibleCount] = useState(20);

  useEffect(() => {
    setVisibleCount(20);
  }, [searchQuery, categoryFilter, sortBy]);

  const { data: petitions = [], isLoading } = useQuery({
    queryKey: ["petitions"],
    queryFn: async () => {
      try {
        const all = await api.entities.Petition.list("-created_date");
        return (all || []).slice(0, 100);
      } catch {
        return [];
      }
    },
    staleTime: 60_000,
  });

  const { data: signatures = [] } = useQuery({
    queryKey: ["mySignatures", user?.id],
    queryFn: async () => {
      try {
        const rows = await api.entities.PetitionSignature.filter({ user_id: user.id });
        return rows || [];
      } catch {
        return [];
      }
    },
    enabled: !!user,
    staleTime: 5 * 60_000,
  });

  const mySignedPetitionIds = new Set(signatures.map(s => s.petition_id));

  // Filter active, approved petitions
  const activePetitions = petitions.filter(
    p => (p.status === 'active' || p.status === 'delivered') && p.moderation_status === 'approved'
  );

  const filteredPetitions = activePetitions
    .filter(p => {
      if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      const searchable = [
        p.title,
        p.short_summary,
        p.full_description,
        p.target_name,
        p.target_type,
        p.category,
        p.country_code,
        p.region_code,
        p.requested_action,
        ...(p.tags || []),
      ].filter(Boolean).join(" ").toLowerCase();
      return searchable.includes(query);
    })
    .sort((a, b) => {
      if (sortBy === 'most_signatures') return b.signature_count_total - a.signature_count_total;
      if (sortBy === 'newest') return new Date(b.created_date) - new Date(a.created_date);
      if (sortBy === 'nearing_goal') {
        const aProgress = (a.signature_goal || 0) > 0 ? (a.signature_count_total || 0) / a.signature_goal : 0;
        const bProgress = (b.signature_goal || 0) > 0 ? (b.signature_count_total || 0) / b.signature_goal : 0;
        return bProgress - aProgress;
      }
      if (sortBy === 'ending_soon') {
        if (!a.deadline && !b.deadline) return 0;
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline) - new Date(b.deadline);
      }
      return 0;
    });

  const nearingGoal = activePetitions
    .filter(p => {
      const goal = p.signature_goal || 0;
      if (goal === 0) return false;
      return (p.signature_count_total || 0) / goal >= 0.8;
    })
    .sort((a, b) => (b.signature_count_total || 0) - (a.signature_count_total || 0))
    .slice(0, 3);

  const recentlyDelivered = petitions
    .filter(p => p.status === 'delivered')
    .sort((a, b) => new Date(b.delivered_at) - new Date(a.delivered_at))
    .slice(0, 3);

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["petitions"] });
    await queryClient.invalidateQueries({ queryKey: ["mySignatures"] });
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="py-4 sm:py-6">
      {/* Education Banner */}
      <Alert className="border-blue-200 bg-blue-50 mb-6">
        <Shield className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-sm text-blue-800">
          <strong>Petitions for Change:</strong> Create and sign fact-based petitions calling for policy
          changes, corporate accountability, and government action. All petitions are reviewed for safety
          and must follow community standards.
        </AlertDescription>
      </Alert>

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Petitions</h1>
          <p className="text-slate-600">
            Voice your support for change in your community and around the world
          </p>
        </div>
        {user && (
          <Button
            onClick={() => navigate(createPageUrl("CreatePetition"))}
            className="bg-gradient-to-r from-blue-600 to-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Start a Petition
          </Button>
        )}
      </div>

      {/* Spotlight Sections */}
      {(nearingGoal.length > 0 || recentlyDelivered.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {nearingGoal.length > 0 && (
            <Card className="border-amber-200 bg-amber-50/30">
              <CardHeader>
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Target className="w-5 h-5 text-amber-600" />
                  Nearly at Goal
                </h3>
              </CardHeader>
              <CardContent className="space-y-2">
                {nearingGoal.map(p => (
                  <div
                    key={p.id}
                    onClick={() => navigate(createPageUrl("PetitionDetail") + `?id=${p.id}`)}
                    className="p-3 bg-white rounded-lg cursor-pointer hover:shadow-md transition-shadow"
                  >
                    <div className="text-sm font-semibold text-slate-900 mb-1">{p.title}</div>
                    <div className="text-xs text-slate-600">
                      {p.signature_count_total.toLocaleString()} / {p.signature_goal.toLocaleString()} signatures
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {recentlyDelivered.length > 0 && (
            <Card className="border-emerald-200 bg-emerald-50/30">
              <CardHeader>
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-600" />
                  Recently Delivered
                </h3>
              </CardHeader>
              <CardContent className="space-y-2">
                {recentlyDelivered.map(p => (
                  <div
                    key={p.id}
                    onClick={() => navigate(createPageUrl("PetitionDetail") + `?id=${p.id}`)}
                    className="p-3 bg-white rounded-lg cursor-pointer hover:shadow-md transition-shadow"
                  >
                    <div className="text-sm font-semibold text-slate-900 mb-1">{p.title}</div>
                    <div className="text-xs text-slate-600">{p.target_name}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Search & Filters */}
      <Card className="border-slate-200 p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Search petitions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <MobileSelect
            value={categoryFilter}
            onValueChange={setCategoryFilter}
            options={CATEGORIES}
            placeholder="All Categories"
            className="w-full md:w-[220px]"
          />
        </div>

        <Tabs value={sortBy} onValueChange={setSortBy}>
          <TabsList className="border-b border-slate-200 w-full bg-white rounded-none p-0 h-auto gap-0 grid grid-cols-4">
            <TabsTrigger className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent text-slate-500 font-medium px-4 py-3 text-sm transition-colors" value="most_signatures">
              <Users className="w-4 h-4 mr-2" />
              Most Signed
            </TabsTrigger>
            <TabsTrigger className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent text-slate-500 font-medium px-4 py-3 text-sm transition-colors" value="newest">
              <Clock className="w-4 h-4 mr-2" />
              Newest
            </TabsTrigger>
            <TabsTrigger className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent text-slate-500 font-medium px-4 py-3 text-sm transition-colors" value="nearing_goal">
              <Target className="w-4 h-4 mr-2" />
              Near Goal
            </TabsTrigger>
            <TabsTrigger className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent text-slate-500 font-medium px-4 py-3 text-sm transition-colors" value="ending_soon">
              <AlertCircle className="w-4 h-4 mr-2" />
              Ending Soon
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </Card>

      {/* Petitions Grid */}
      {isLoading ? (
        <div className="min-h-[400px]">
          <SkeletonCardGrid count={6} />
        </div>
      ) : filteredPetitions.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No petitions found"
          text="Try adjusting your filters, or start the first petition in this category."
          action={user ? { label: "Start a Petition", onClick: () => navigate(createPageUrl("CreatePetition")) } : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 min-h-[400px]">
          {filteredPetitions.slice(0, visibleCount).map(petition => (
            <PetitionCard
              key={petition.id}
              petition={petition}
              hasSigned={mySignedPetitionIds.has(petition.id)}
              onClick={() => navigate(createPageUrl("PetitionDetail") + `?id=${petition.id}`)}
            />
          ))}
        </div>
      )}
      {filteredPetitions.length > visibleCount && (
        <div className="text-center mt-8">
          <Button variant="outline" onClick={() => setVisibleCount(prev => prev + 20)} className="border-slate-300 text-slate-700 hover:bg-slate-50">
            Load More Petitions ({filteredPetitions.length - visibleCount} remaining)
          </Button>
        </div>
      )}
    </div>
    </PullToRefresh>
  );
}