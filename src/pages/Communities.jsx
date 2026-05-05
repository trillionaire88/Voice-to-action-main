import React, { useState, useEffect } from "react";
import { api } from '@/api/client';
import { getCommunitiesVisible, getMyPrivateCommunities, joinCommunityWithCode } from "@/api/communityApi";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import PullToRefresh from "@/components/ui/PullToRefresh";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import MobileSelect from "@/components/ui/MobileSelect";
import {
  Users,
  Plus,
  Search,
  GraduationCap,
  Building2,
  Landmark,
  Heart,
  Newspaper,
  Lock,
  Globe2,
  TrendingUp,
  CheckCircle2,
  Sparkles,
  PlusCircle,
  MessageSquare,
  BarChart3,
  FileText,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  communityName,
  communityDescriptionPublic,
  communityPlanTier,
  communityOwnerId,
  communityLogoUrl,
} from "@/lib/communityFields";

const COMMUNITY_TYPE_ICONS = {
  public_community: Users,
  private_community: Lock,
  educational: GraduationCap,
  corporate_business: Building2,
  council_local_government: Landmark,
  regional_government: Landmark,
  national_government: Landmark,
  political_figure_party: Users,
  ngo_charity: Heart,
  media_journalism: Newspaper,
  temporary_event: Users,
  experimental_pilot: Users,
};

const ABOUT_SECTIONS = [
  {
    icon: Users,
    title: "Public Communities",
    color: "text-purple-600",
    bg: "bg-purple-50",
    border: "border-purple-200",
    body: "Public communities allow open participation and can be viewed by all users. Businesses, organisations, local groups, and public services use them to gather feedback, answer questions, report problems, and discuss ideas in a structured environment. Members can create discussions, start polls, submit petitions, upload supporting material, and follow the community for updates.",
  },
  {
    icon: ShieldCheck,
    title: "Paid Communities",
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    body: "Paid communities give creators advanced tools including verified community status, multiple administrators, detailed analytics, priority placement in search results, official response posts, and advanced moderation controls. Designed for organisations that want to maintain an active, professional presence and use the community as a structured communication and feedback channel.",
  },
  {
    icon: Lock,
    title: "Private Communities",
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    border: "border-indigo-200",
    body: "Private communities keep discussions within a restricted group. Not visible to the public, they require an invitation or access code to join. Ideal for internal company discussions, school or education groups, staff communication, organisation planning, private projects, or restricted member groups.",
  },
  {
    icon: Building2,
    title: "For Businesses & Public Organisations",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    body: "Any business, service provider, council, government department, or organisation can create a community page where users can discuss experiences, provide feedback, and suggest improvements. Use it to receive customer feedback, respond to concerns, gather public opinion through polls, organise petitions, and communicate updates.",
  },
  {
    icon: MessageSquare,
    title: "Discussions, Feedback & Issue Tracking",
    color: "text-orange-600",
    bg: "bg-orange-50",
    border: "border-orange-200",
    body: "Inside each community, users can create discussions about any topic. Posts can include image uploads, replies and threaded conversations, reactions, and tags like feedback, issue, or announcement. Discussions can also be linked to polls or petitions. This structure makes communities a long-term record of conversation, not temporary comments that are easily lost.",
  },
  {
    icon: BarChart3,
    title: "Petitions & Polls Within Communities",
    color: "text-rose-600",
    bg: "bg-rose-50",
    border: "border-rose-200",
    body: "Communities can host petitions and polls that relate specifically to the group, organisation, or topic they represent. Members can measure support for ideas, propose changes, or organise collective action within a focused space. These remain part of the platform's permanent record and can be viewed alongside the discussions that led to them.",
  },
];

export default function Communities() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [showAbout, setShowAbout] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [scopeFilter, setScopeFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [joiningCode, setJoiningCode] = useState(false);

  useEffect(() => {
    if (searchParams.get("subscribed") === "1") {
      toast.success("Subscription updated — thank you!");
    }
  }, [searchParams]);

  const { data: communities = [], isLoading } = useQuery({
    queryKey: ["communities", planFilter],
    queryFn: async () => {
      try {
        if (planFilter === "private") {
          return await getMyPrivateCommunities();
        }
        if (planFilter === "all") return await getCommunitiesVisible("all");
        if (planFilter === "free") return await getCommunitiesVisible("free");
        if (planFilter === "paid") return await getCommunitiesVisible("paid");
        return await getCommunitiesVisible("all");
      } catch {
        const allCommunities = await api.entities.Community.list("-created_date");
        return allCommunities.filter(c => c.status === "active" && c.visibility !== "private");
      }
    },
    staleTime: 2 * 60_000,
  });

  const { data: myPrivateCommunities = [] } = useQuery({
    queryKey: ["myPrivateCommunities", user?.id],
    queryFn: async () => {
      try {
        return await getMyPrivateCommunities();
      } catch {
        if (!user) return [];
        const memberships = await api.entities.CommunityMember.filter({ user_id: user.id, status: "active" });
        if (memberships.length === 0) return [];
        const allCommunities = await api.entities.Community.list("-created_date");
        const myIds = new Set(memberships.map(m => m.community_id));
        return allCommunities.filter(c => c.visibility === "private" && myIds.has(c.id) && c.status === "active");
      }
    },
    enabled: !!user,
    staleTime: 2 * 60_000,
  });

  const { data: myMemberships = [] } = useQuery({
    queryKey: ["myMemberships", user?.id],
    queryFn: async () => {
      if (!user) return [];
      return await api.entities.CommunityMember.filter({ user_id: user.id, status: "active" });
    },
    enabled: !!user,
  });

  const myMembershipIds = new Set(myMemberships.map(m => m.community_id));

  const filteredCommunities = communities.filter((community) => {
    // Private-plan communities are never shown in the public directory
    const tier = communityPlanTier(community);
    if (tier === "private") return false;
    if (community.visibility === "private") return false;

    const name = communityName(community);
    const desc = communityDescriptionPublic(community);
    const matchesSearch = !searchQuery ||
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      desc.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = typeFilter === "all" || community.community_type === typeFilter;
    const matchesScope = scopeFilter === "all" || community.geographic_scope === scopeFilter;

    return matchesSearch && matchesType && matchesScope;
  });

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["communities"] });
    await queryClient.invalidateQueries({ queryKey: ["myMemberships"] });
    await queryClient.invalidateQueries({ queryKey: ["myPrivateCommunities"] });
  };

  const handleJoinWithCode = async () => {
    if (!inviteCodeInput.trim()) return;
    if (!user) {
      toast.error("Sign in to join with a code");
      return;
    }
    setJoiningCode(true);
    try {
      const { communityId, communityName } = await joinCommunityWithCode(inviteCodeInput);
      toast.success(`Joined ${communityName}`);
      setInviteCodeInput("");
      await queryClient.invalidateQueries({ queryKey: ["myMemberships"] });
      await queryClient.invalidateQueries({ queryKey: ["communities"] });
      navigate(createPageUrl("CommunityDetail") + `?id=${communityId}`);
    } catch (e) {
      toast.error(e.message || "Could not join");
    } finally {
      setJoiningCode(false);
    }
  };

  const isCommunityOwner = (c) =>
    user && communityOwnerId(c) === user.id;

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="w-full pb-16">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-purple-900 via-purple-800 to-purple-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl sm:text-5xl font-bold mb-6">
              Communities
            </h1>
            <p className="text-xl text-purple-100 mb-10">
              Create and join communities for your organization, school, or shared interests
            </p>
            {user && (
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  size="lg"
                  onClick={() => navigate(createPageUrl("CreateCommunity"))}
                  className="bg-white text-purple-900 hover:bg-purple-50"
                >
                  <PlusCircle className="w-5 h-5 mr-2" />
                  Create Community
                </Button>

              </div>
            )}
          </div>
        </div>
      </section>

      {/* About Communities Section */}
      <section className="bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {/* Intro */}
          <div className="max-w-3xl mx-auto text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">What Communities Bring to Voice to Action</h2>
            <p className="text-slate-600 leading-relaxed">
              Communities provide dedicated spaces where individuals, organisations, businesses, public institutions, and groups can create structured environments for discussion, feedback, collaboration, and public participation. A community can represent almost anything — a business, local area, council, school, service provider, interest group, or private team.
            </p>
          </div>

          {/* Feature cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {ABOUT_SECTIONS.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.title} className={`rounded-xl border p-5 ${s.bg} ${s.border}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`w-5 h-5 flex-shrink-0 ${s.color}`} />
                    <h3 className={`font-semibold text-sm ${s.color}`}>{s.title}</h3>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">{s.body}</p>
                </div>
              );
            })}
          </div>

          {/* Expandable extra detail */}
          <div className="max-w-3xl mx-auto">
            <button
              onClick={() => setShowAbout(v => !v)}
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 mx-auto transition-colors"
            >
              {showAbout ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {showAbout ? "Show less" : "Learn more about community management & verification"}
            </button>
            {showAbout && (
              <div className="mt-5 grid sm:grid-cols-2 gap-4">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck className="w-5 h-5 text-slate-600" />
                    <h3 className="font-semibold text-sm text-slate-800">Community Management & Moderation</h3>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">Each community has an owner who controls how it operates. Owners can assign additional administrators, manage posts, control visibility settings, and decide whether the community is public or private. Administrators may review discussions, remove content that breaks the rules, and manage membership where required.</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <h3 className="font-semibold text-sm text-slate-800">Verified Communities</h3>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">Communities may apply for verification to confirm the page is managed by the organisation or group it represents. Verified communities display a badge indicating the page has been confirmed. Verification provides additional features and helps users identify official community pages, but does not represent endorsement by the platform.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* My Private Communities */}
      {user && myPrivateCommunities.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <div className="flex items-center gap-2 mb-4">
            <Lock className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-bold text-slate-900">My Private Communities</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {myPrivateCommunities.map((community) => (
              <Card
                key={community.id}
                className="hover:shadow-lg transition-shadow cursor-pointer border-purple-200 bg-purple-50"
                onClick={() => navigate(createPageUrl("CommunityDetail") + `?id=${community.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start gap-3">
                    {community.logo_url ? (
                      <img src={community.logo_url} alt={community.name} className="w-12 h-12 rounded-lg object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-purple-200 flex items-center justify-center">
                        <Lock className="w-6 h-6 text-purple-600" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg mb-1 truncate">{community.name}</CardTitle>
                      <div className="flex flex-wrap gap-1">
                        <Badge className="text-xs bg-purple-600 text-white">
                          <Lock className="w-3 h-3 mr-1" /> Private
                        </Badge>
                        <Badge className="text-xs bg-blue-500 text-white">Member</Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600 mb-4 line-clamp-2">{community.description_public}</p>
                  <div className="flex items-center gap-1 text-sm text-slate-500">
                    <Users className="w-4 h-4" />
                    <span>{community.member_count} members</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Filters */}
      <section className="w-full md:max-w-7xl md:mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-wrap gap-2 mb-4">
          {[
            { id: "all", label: "All" },
            { id: "free", label: "Free" },
            { id: "paid", label: "Paid" },
            { id: "private", label: "Private (mine)" },
          ].map((t) => (
            <Button
              key={t.id}
              size="sm"
              variant={planFilter === t.id ? "default" : "outline"}
              className={planFilter === t.id ? "bg-purple-600 hover:bg-purple-700" : ""}
              onClick={() => setPlanFilter(t.id)}
            >
              {t.label}
            </Button>
          ))}
        </div>

        {user && (
          <Card className="border-slate-200 mb-6">
            <CardContent className="p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              <div className="flex-1 flex gap-2">
                <Input
                  placeholder="Join private community with invite code…"
                  value={inviteCodeInput}
                  onChange={(e) => setInviteCodeInput(e.target.value)}
                  className="max-w-md"
                />
                <Button onClick={handleJoinWithCode} disabled={joiningCode || !inviteCodeInput.trim()}>
                  Join
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-slate-200 mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    placeholder="Search communities..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <MobileSelect
                value={typeFilter}
                onValueChange={setTypeFilter}
                placeholder="All Types"
                options={[
                  { value: "all", label: "All Types" },
                  { value: "public_community", label: "Public" },
                  { value: "educational", label: "Educational" },
                  { value: "corporate_business", label: "Corporate" },
                  { value: "council_local_government", label: "Local Gov" },
                  { value: "ngo_charity", label: "NGO/Charity" },
                ]}
                className="lg:w-[220px]"
              />
              <MobileSelect
                value={scopeFilter}
                onValueChange={setScopeFilter}
                placeholder="All Scopes"
                options={[
                  { value: "all", label: "All Scopes" },
                  { value: "global", label: "Global" },
                  { value: "country", label: "Country" },
                  { value: "region", label: "Region" },
                  { value: "city", label: "City" },
                ]}
                className="lg:w-[220px]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Communities Grid */}
        {isLoading ? (
          <div className="text-center py-16 text-slate-600">Loading communities...</div>
        ) : filteredCommunities.length === 0 ? (
          <Card className="border-dashed border-2 border-slate-300">
            <CardContent className="py-16 text-center">
              <Users className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-900 mb-2">No communities found</h3>
              <p className="text-slate-600 mb-6">Try adjusting your filters or create the first one</p>
              {user && (
                <Button onClick={() => navigate(createPageUrl("CreateCommunity"))}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Community
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCommunities.map((community) => {
              const Icon = COMMUNITY_TYPE_ICONS[community.community_type] || Users;
              const isMember = myMembershipIds.has(community.id);
              const tier = communityPlanTier(community);
              const showVerified =
                community.verified_badge ||
                community.community_verified ||
                community.verification_status === "verified" ||
                community.verified_community;

              return (
                <Card
                  key={community.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => navigate(createPageUrl("CommunityDetail") + `?id=${community.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      {communityLogoUrl(community) ? (
                        <img src={communityLogoUrl(community)} alt={communityName(community)} className="w-12 h-12 rounded-lg object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                          <Icon className="w-6 h-6 text-purple-600" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg mb-1 truncate">{communityName(community)}</CardTitle>
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="outline" className="text-xs">
                            {(community.community_type || "").replace(/_/g, ' ')}
                          </Badge>
                          {tier === "paid" && (
                            <Badge className="text-xs bg-blue-600 text-white">Paid</Badge>
                          )}
                          {showVerified && (
                            <Badge className="text-xs bg-emerald-500">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Verified
                            </Badge>
                          )}
                          {community.join_policy === "approval_required" && (
                            <Badge variant="outline" className="text-xs border-amber-400 text-amber-700">Approval Required</Badge>
                          )}
                          {community.join_policy === "invite_only" && (
                            <Badge variant="outline" className="text-xs border-purple-400 text-purple-700">
                              <Lock className="w-3 h-3 mr-1" />Invite Only
                            </Badge>
                          )}
                          {isMember && (
                            <Badge className="text-xs bg-blue-500">Member</Badge>
                          )}
                        </div>
                        {isCommunityOwner(community) && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/community-subscription?community_id=${community.id}`);
                            }}
                          >
                            Manage plan
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                      {communityDescriptionPublic(community)}
                    </p>
                    <div className="flex items-center justify-between text-sm text-slate-500">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {community.member_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-4 h-4" />
                          {community.poll_count}
                        </span>
                      </div>
                      {community.geographic_scope !== "global" && (
                        <div className="flex items-center gap-1">
                          <Globe2 className="w-3 h-3" />
                          <span className="text-xs">{community.country_code}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
    </PullToRefresh>
  );
}