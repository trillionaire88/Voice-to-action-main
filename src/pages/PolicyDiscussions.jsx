import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import MobileSelect from "@/components/ui/MobileSelect";
import PullToRefresh from "@/components/ui/PullToRefresh";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, PlusCircle, Search } from "lucide-react";
import { userPassesGate } from "../components/auth/VerificationGate";
import AIPolicySummary from "../components/policy/AIPolicySummary";
import DiscussionCard from "../components/policy/DiscussionCard";
import NewDiscussionModal from "../components/policy/NewDiscussionModal";

const POLICY_AREAS = [
  { value: "all", label: "All Areas" },
  { value: "healthcare", label: "Healthcare" },
  { value: "environment", label: "Environment & Climate" },
  { value: "economy", label: "Economy & Jobs" },
  { value: "education", label: "Education" },
  { value: "housing", label: "Housing & Cost of Living" },
  { value: "immigration", label: "Immigration" },
  { value: "defense", label: "Defence & Security" },
  { value: "taxation", label: "Taxation" },
  { value: "technology", label: "Technology & AI" },
  { value: "social_welfare", label: "Social Welfare" },
  { value: "justice", label: "Justice & Law Reform" },
  { value: "infrastructure", label: "Infrastructure" },
  { value: "other", label: "Other" },
];

export default function PolicyDiscussions() {
  const { user, navigateToLogin } = useAuth();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [selectedArea, setSelectedArea] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewModal, setShowNewModal] = useState(false);
  const [setupMessage, setSetupMessage] = useState(null);

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["policyDiscussions"] });
  };

  const { data: discussions = [], isLoading } = useQuery({
    queryKey: ["policyDiscussions"],
    queryFn: async () => {
      const tryTable = async (table) => {
        const { data, error } = await supabase
          .from(table)
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100);
        if (error) {
          const { data: d2, error: e2 } = await supabase
            .from(table)
            .select("*")
            .order("created_date", { ascending: false })
            .limit(100);
          if (e2) return { data: null, error: e2 };
          return { data: d2, error: null };
        }
        return { data, error: null };
      };

      let r = await tryTable("policy_discussions");
      if (r.error && (r.error.code === "42P01" || r.error.message?.includes("does not exist"))) {
        r = await tryTable("discussions");
      }
      if (r.error) {
        if (r.error.code === "42P01" || r.error.message?.includes("does not exist")) {
          setSetupMessage("Discussions are being set up. Check back soon.");
          return [];
        }
        setSetupMessage(null);
        return [];
      }
      setSetupMessage(null);
      return r.data || [];
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    const focus = searchParams.get("focus");
    if (!focus || !discussions.length) return;
    const el = document.getElementById(`discussion-${focus}`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [searchParams, discussions]);

  const filtered = discussions
    .filter((d) => selectedArea === "all" || d.policy_area === selectedArea)
    .filter((d) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return d.title?.toLowerCase().includes(q) || d.body?.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (sortBy === "popular") return (b.upvotes || 0) - (a.upvotes || 0);
      if (sortBy === "active") return (b.reply_count || 0) - (a.reply_count || 0);
      const ad = new Date(a.created_date || a.created_at || 0);
      const bd = new Date(b.created_date || b.created_at || 0);
      return bd - ad;
    });

  const pinned = filtered.filter((d) => d.is_pinned);
  const regular = filtered.filter((d) => !d.is_pinned);
  const sortedDiscussions = [...pinned, ...regular];

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3">
            <MessageSquare className="w-8 h-8 text-blue-600" />
            Policy Discussions
          </h1>
          <p className="text-slate-500 mt-1 text-sm">Open public forum on current policy changes and governance. Your voice matters.</p>
        </div>
        {user && userPassesGate(user, false) ? (
          <Button
            onClick={() => setShowNewModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-2 flex-shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            Start Discussion
          </Button>
        ) : user ? (
          <a
            href="/SecuritySettings"
            className="text-sm bg-amber-500 hover:bg-amber-600 text-white font-semibold px-4 py-2 rounded-lg flex-shrink-0"
          >
            Verify email to post
          </a>
        ) : (
          <Button
            onClick={() => navigateToLogin()}
            variant="outline"
            className="flex-shrink-0"
          >
            Sign in to participate
          </Button>
        )}
      </div>

      {setupMessage && (
        <div className="mb-6 text-center text-slate-600 text-sm border border-slate-200 rounded-xl py-8 px-4 bg-slate-50">
          {setupMessage}
        </div>
      )}

      {!setupMessage && (
      <>
      <AIPolicySummary discussions={filtered} selectedArea={selectedArea} />

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search discussions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-white text-slate-900 border-slate-300 placeholder:text-slate-400"
          />
        </div>
        <MobileSelect
          value={selectedArea}
          onValueChange={setSelectedArea}
          options={POLICY_AREAS}
          placeholder="Policy area"
          className="w-full sm:w-52"
        />
        <MobileSelect
          value={sortBy}
          onValueChange={setSortBy}
          options={[
            { value: "recent", label: "Most Recent" },
            { value: "popular", label: "Most Popular" },
            { value: "active", label: "Most Active" },
          ]}
          placeholder="Sort by"
          className="w-full sm:w-40"
        />
      </div>

      <div className="flex items-center gap-3 mb-5">
        <Badge className="bg-blue-50 text-blue-700 border-blue-200">
          {sortedDiscussions.length} discussions
        </Badge>
        {selectedArea !== "all" && (
          <Badge className="bg-slate-100 text-slate-600 border-slate-200 capitalize">
            {selectedArea.replace(/_/g, " ")}
          </Badge>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : sortedDiscussions.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <MessageSquare className="w-14 h-14 mx-auto mb-4 text-slate-200" />
          <p className="text-lg font-semibold text-slate-500">No discussions yet</p>
          <p className="text-sm mt-1">Be the first to start a conversation about this policy area.</p>
          {user && (
            <Button className="mt-4 bg-blue-600 hover:bg-blue-700" onClick={() => setShowNewModal(true)}>
              <PlusCircle className="w-4 h-4 mr-2" /> Start a Discussion
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {sortedDiscussions.map((d) => (
            <div key={d.id} id={`discussion-${d.id}`}>
              <DiscussionCard discussion={d} user={user} />
            </div>
          ))}
        </div>
      )}

      <NewDiscussionModal open={showNewModal} onClose={() => setShowNewModal(false)} user={user} />
      </>
      )}
    </div>
    </PullToRefresh>
  );
}
