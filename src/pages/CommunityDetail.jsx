import React, { useState, useMemo } from "react";
import { api } from '@/api/client';
import { useAuth } from "@/lib/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Users,
  Settings,
  TrendingUp,
  Calendar,
  CheckCircle2,
  Shield,
  Lock,
  Globe2,
  UserPlus,
  BarChart3,
  FileText,
  Image,
  MessageSquare,
  ArrowLeft,
  Star,
} from "lucide-react";
import CommunityPetitionNotification from "@/components/community/CommunityPetitionNotification";
import CommunityAccessCodeSettings from "@/components/community/CommunityAccessCodeSettings";
import CommunityJoinWithCode from "@/components/community/CommunityJoinWithCode";
import CommunityDiscussionsTab from "@/components/community/CommunityDiscussionsTab";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import SocialShareButtons from "@/components/social/SocialShareButtons";

export default function CommunityDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const communityId = urlParams.get("id");
  const safeCommunityId = communityId
    ? String(communityId).replace(/[^a-zA-Z0-9\-_]/g, "").slice(0, 128) || null
    : null;
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  const { data: community, isLoading } = useQuery({
    queryKey: ["community", safeCommunityId],
    queryFn: () => api.entities.Community.filter({ id: safeCommunityId }).then(r => r[0]),
    enabled: !!safeCommunityId,
  });

  const { data: membership } = useQuery({
    queryKey: ["communityMembership", communityId, user?.id],
    queryFn: async () => {
      const members = await api.entities.CommunityMember.filter({
        community_id: safeCommunityId,
        user_id: user.id,
      });
      return members[0];
    },
    enabled: !!safeCommunityId && !!user,
  });

  const { data: members = [] } = useQuery({
    queryKey: ["communityMembers", communityId],
    queryFn: () => api.entities.CommunityMember.filter({ community_id: safeCommunityId }),
    enabled: !!safeCommunityId,
  });

  const { data: polls = [] } = useQuery({
    queryKey: ["communityPolls", safeCommunityId],
    queryFn: () => api.entities.CommunityPoll.filter({ community_id: safeCommunityId }),
    enabled: !!safeCommunityId,
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["communityRoles", safeCommunityId],
    queryFn: () => api.entities.CommunityRole.filter({ community_id: safeCommunityId }),
    enabled: !!safeCommunityId,
  });

  const { data: endorsements = [], refetch: refetchEndorsements } = useQuery({
    queryKey: ["communityEndorsements", safeCommunityId],
    queryFn: () => api.entities.CommunityPetitionEndorsement.filter({ community_id: safeCommunityId, status: "active" }),
    enabled: !!safeCommunityId,
  });

  const { data: myResponses = [], refetch: refetchMyResponses } = useQuery({
    queryKey: ["myPetitionResponses", safeCommunityId, user?.id],
    queryFn: () => api.entities.CommunityPetitionResponse.filter({ community_id: safeCommunityId, user_id: user.id }),
    enabled: !!safeCommunityId && !!user,
  });

  // Endorsements the current user hasn't responded to yet
  const pendingEndorsements = useMemo(() => {
    const respondedIds = new Set(myResponses.map(r => r.endorsement_id));
    return endorsements.filter(e => !respondedIds.has(e.id));
  }, [endorsements, myResponses]);

  // State for endorsement form
  const [endorsePetitionId, setEndorsePetitionId] = useState("");
  const [endorseTitle, setEndorseTitle] = useState("");
  const [endorseSummary, setEndorseSummary] = useState("");
  const [endorseLoading, setEndorseLoading] = useState(false);

  const handleEndorsePetition = async (e) => {
    e.preventDefault();
    if (!endorsePetitionId.trim() || !endorseTitle.trim()) return;
    setEndorseLoading(true);
    await api.entities.CommunityPetitionEndorsement.create({
      community_id: communityId,
      petition_id: endorsePetitionId.trim(),
      endorsed_by_user_id: user.id,
      petition_title: endorseTitle.trim(),
      petition_summary: endorseSummary.trim(),
      status: "active",
    });
    setEndorsePetitionId("");
    setEndorseTitle("");
    setEndorseSummary("");
    setEndorseLoading(false);
    refetchEndorsements();
    toast.success("Petition endorsed — all members will be notified.");
  };

  const [showCodeInput, setShowCodeInput] = useState(false);

  const handleJoinCommunity = async () => {
    if (community.join_policy === "invite_only") {
      setShowCodeInput(true);
      return;
    }
    joinMutation.mutate();
  };

  const handleCodeSuccess = () => {
    setShowCodeInput(false);
    joinMutation.mutate();
  };

  const joinMutation = useMutation({
    mutationFn: async () => {
      const status = community.join_policy === "open" ? "active" : "pending_approval";
      return await api.entities.CommunityMember.create({
        community_id: communityId,
        user_id: user.id,
        role: "member",
        status,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["communityMembership", communityId]);
      queryClient.invalidateQueries(["communityMembers", communityId]);
      toast.success(community.join_policy === "open" ? "Joined community!" : "Join request sent");
    },
    onError: () => {
      toast.error("Failed to join community");
    },
  });

  if (isLoading || !community) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 space-y-4">
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const isMember = membership?.status === "active";
  const isPendingApproval = membership?.status === "pending_approval";
  const isPlatformAdmin = user?.role === "admin" || user?.role === "owner_admin";
  const isOwner = community && (community.community_owner === user?.id || community.founder_user_id === user?.id);
  const effectivePlan = community ? (community.plan || community.community_plan || "free") : "free";
  const isPaidTier = effectivePlan === "paid" || effectivePlan === "private";
  const showPlanVerified = community?.verified_badge || community?.verified_community || community?.community_verified;
  const isAdmin = isOwner || isPlatformAdmin ||
    membership?.role === "founder" || membership?.role === "admin" ||
    (community?.community_admins || []).includes(user?.id);
  const canManage = isAdmin;

  const getCommunityTypeInfo = () => {
    const types = {
      general: { icon: Users, label: "General", color: "blue" },
      business: { icon: Users, label: "Business", color: "indigo" },
      company: { icon: Users, label: "Company", color: "indigo" },
      council: { icon: Users, label: "Council", color: "red" },
      government: { icon: Users, label: "Government", color: "rose" },
      gym: { icon: Users, label: "Gym", color: "orange" },
      school: { icon: Users, label: "School", color: "green" },
      organisation: { icon: Users, label: "Organisation", color: "teal" },
      private: { icon: Lock, label: "Private", color: "purple" },
      public_community: { icon: Users, label: "Public Community", color: "blue" },
      private_community: { icon: Lock, label: "Private Community", color: "purple" },
      educational: { icon: Users, label: "Educational", color: "green" },
      corporate_business: { icon: Users, label: "Corporate/Business", color: "indigo" },
      council_local_government: { icon: Users, label: "Local Government", color: "red" },
      regional_government: { icon: Users, label: "Regional Government", color: "orange" },
      national_government: { icon: Users, label: "National Government", color: "rose" },
      political_figure_party: { icon: Users, label: "Political", color: "violet" },
      ngo_charity: { icon: Users, label: "NGO/Charity", color: "pink" },
      media_journalism: { icon: Users, label: "Media", color: "cyan" },
      temporary_event: { icon: Calendar, label: "Event", color: "amber" },
      experimental_pilot: { icon: Users, label: "Experimental", color: "slate" },
    };
    return types[community.community_type] || types.general;
  };

  const typeInfo = getCommunityTypeInfo();
  const TypeIcon = typeInfo.icon;

  return (
    <div className="pb-16">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl("Communities"))}
            className="text-white hover:bg-white/10 mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Communities
          </Button>

          <div className="flex items-start gap-6">
            {community.logo_url ? (
              <img src={community.logo_url} alt={community.name} className="w-20 h-20 rounded-xl object-cover" />
            ) : (
              <div className="w-20 h-20 rounded-xl bg-white/10 flex items-center justify-center">
                <TypeIcon className="w-10 h-10 text-white/60" />
              </div>
            )}

            <div className="flex-1">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h1 className="text-3xl font-bold mb-2">{community.community_name || community.name}</h1>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={`bg-${typeInfo.color}-500 text-white`}>
                      {typeInfo.label}
                    </Badge>
                    {(community.verified_community || community.verification_status === "verified" || showPlanVerified) && (
                      <Badge className="bg-emerald-500 text-white">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Verified Community
                      </Badge>
                    )}
                    {effectivePlan === "paid" && (
                      <Badge className="bg-blue-500 text-white capitalize">Paid plan</Badge>
                    )}
                    {effectivePlan === "private" && (
                      <Badge className="bg-purple-600 text-white capitalize">Private plan</Badge>
                    )}
                    {effectivePlan === "free" && (
                      <Badge variant="outline" className="text-white border-white/40 bg-white/10">Free plan</Badge>
                    )}
                    {community.visibility === "private" && (
                      <Badge className="bg-purple-500 text-white">
                        <Lock className="w-3 h-3 mr-1" /> Private
                      </Badge>
                    )}
                    {community.geographic_scope !== "global" && (
                      <Badge className="bg-blue-500 text-white">
                        <Globe2 className="w-3 h-3 mr-1" />
                        {community.city || community.region_code || community.country_code}
                      </Badge>
                    )}
                  </div>
                </div>

                {user && (
                   <div className="flex gap-2">
                     {!isMember && !isPendingApproval && (
                       <Button
                         onClick={handleJoinCommunity}
                         disabled={joinMutation.isPending}
                         className="bg-white text-slate-900 hover:bg-slate-100"
                       >
                         <UserPlus className="w-4 h-4 mr-2" />
                         {community.join_policy === "open" ? "Join Community" : "Request to Join"}
                       </Button>
                     )}
                    {isPendingApproval && (
                      <Badge className="bg-amber-500 text-white">Pending Approval</Badge>
                    )}
                    {(isOwner || isPlatformAdmin) && (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => navigate(`/EditCommunity?id=${communityId}`)}
                          className="border-white bg-white/20 text-white hover:bg-white/30 font-semibold"
                        >
                          <Settings className="w-4 h-4 mr-2" /> Manage Community
                        </Button>
                        {isOwner && effectivePlan === "free" && (
                          <Button
                            className="bg-amber-500 text-slate-900 hover:bg-amber-400 font-semibold"
                            onClick={() => navigate(`/community-subscription?community_id=${communityId}`)}
                          >
                            Upgrade plan
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              <p className="text-blue-100 text-lg">{community.community_description || community.description_public}</p>

              {showCodeInput && (
                <div className="mt-4 max-w-sm bg-white/10 rounded-xl p-4">
                  <p className="text-white text-sm font-semibold mb-3">This community requires an access code</p>
                  <CommunityJoinWithCode communityId={communityId} userId={user?.id} onSuccess={handleCodeSuccess} />
                  <button onClick={() => setShowCodeInput(false)} className="text-white/60 text-xs mt-2 hover:text-white">Cancel</button>
                </div>
              )}

              {/* Stats */}
              <div className="flex gap-6 mt-6">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-300" />
                  <span className="font-semibold">{community.member_count}</span>
                  <span className="text-blue-200 text-sm">members</span>
                </div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-green-300" />
                  <span className="font-semibold">{community.poll_count}</span>
                  <span className="text-blue-200 text-sm">polls</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-purple-300" />
                  <span className="font-semibold">{community.decision_count}</span>
                  <span className="text-blue-200 text-sm">decisions</span>
                </div>
                {(community.post_count != null || isPaidTier) && (
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-amber-300" />
                    <span className="font-semibold">{community.post_count ?? 0}</span>
                    <span className="text-blue-200 text-sm">posts</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {isPaidTier && (isMember || isOwner) && (
          <Card className="mb-6 border-blue-200 bg-blue-50/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                Community analytics
              </CardTitle>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-slate-500">Members</p>
                <p className="text-2xl font-bold text-slate-900">{community.member_count ?? 0}</p>
              </div>
              <div>
                <p className="text-slate-500">Posts</p>
                <p className="text-2xl font-bold text-slate-900">{community.post_count ?? 0}</p>
              </div>
              <div>
                <p className="text-slate-500">Polls</p>
                <p className="text-2xl font-bold text-slate-900">{polls.length}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {!isMember && !isPendingApproval && effectivePlan === "private" && (
          <Alert className="mb-6 border-purple-200 bg-purple-50">
            <Lock className="h-4 w-4 text-purple-600" />
            <AlertDescription className="text-purple-900">
              This is a private paid community. Join with an invite code from the Communities page, or request access below.
            </AlertDescription>
          </Alert>
        )}

        {!isMember && !isPendingApproval && community.visibility === "private" && (
          <Alert className="mb-6 border-amber-200 bg-amber-50">
            <Lock className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-900">
              This is a private community. You need to join to view content.
            </AlertDescription>
          </Alert>
        )}

        {/* Private community gate */}
        {(community.visibility === "private" || effectivePlan === "private") && !isMember && !isPendingApproval && (
          <div className="py-20 text-center">
            <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <Lock className="w-10 h-10 text-purple-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">Private Community</h2>
            <p className="text-slate-600 max-w-md mx-auto mb-6">
              This is a private community. All content is only visible to approved members.
              You need a private access key or approval from the community admin to join.
            </p>
            {user ? (
              <Button
                onClick={() => joinMutation.mutate()}
                disabled={joinMutation.isPending}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Request to Join
                  </Button>
                ) : (
                <Button onClick={() => api.auth.redirectToLogin()}>Sign In to Request Access</Button>
                )}
                {user && !(user.paid_identity_verification_completed && user.is_kyc_verified) && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-900">
                    <strong>Blue Checkmark Required:</strong> Only verified members with a blue checkmark can join communities.
                    <Button
                      variant="link"
                      className="text-blue-600 underline p-0 ml-1 h-auto"
                      onClick={() => navigate(createPageUrl("Profile"))}
                    >
                      Get verified now
                    </Button>
                  </p>
                </div>
                )}
          </div>
        )}

        {(isMember || (community.visibility !== "private" && effectivePlan !== "private")) && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full border-b border-slate-200 bg-transparent rounded-none p-0 h-auto mb-6">
            <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-slate-500 hover:text-slate-700 font-medium px-4 py-3 text-sm transition-all">Overview</TabsTrigger>
            <TabsTrigger value="polls" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-slate-500 hover:text-slate-700 font-medium px-4 py-3 text-sm transition-all">Polls</TabsTrigger>
            {isMember && <TabsTrigger value="petitions" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-slate-500 hover:text-slate-700 font-medium px-4 py-3 text-sm transition-all">
              Petitions {pendingEndorsements.length > 0 && (
                <span className="ml-1.5 bg-amber-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{pendingEndorsements.length}</span>
              )}
            </TabsTrigger>}
            {isMember && <TabsTrigger value="members" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-slate-500 hover:text-slate-700 font-medium px-4 py-3 text-sm transition-all">Members</TabsTrigger>}
            <TabsTrigger value="discussions" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-slate-500 hover:text-slate-700 font-medium px-4 py-3 text-sm transition-all">Discussions</TabsTrigger>
            {canManage && <TabsTrigger value="settings" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-slate-500 hover:text-slate-700 font-medium px-4 py-3 text-sm transition-all">Settings</TabsTrigger>}
          </TabsList>

          <TabsContent value="overview">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-6">
                {/* About */}
                <Card>
                  <CardHeader>
                    <CardTitle>About</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-sm text-slate-700 mb-2">Description</h4>
                      <p className="text-slate-600">{community.community_description || community.description_public}</p>
                    </div>

                    {isMember && community.description_internal && (
                      <div>
                        <h4 className="font-semibold text-sm text-slate-700 mb-2">Internal Notes (Members Only)</h4>
                        <p className="text-slate-600">{community.description_internal}</p>
                      </div>
                    )}

                    {community.real_world_institution && (
                      <div>
                        <h4 className="font-semibold text-sm text-slate-700 mb-2">Linked Institution</h4>
                        <p className="text-slate-600">{community.real_world_institution}</p>
                      </div>
                    )}

                    {community.tags?.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm text-slate-700 mb-2">Tags</h4>
                        <div className="flex flex-wrap gap-2">
                          {community.tags.map((tag) => (
                            <Badge key={tag} variant="outline">{tag}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Governance */}
                {isMember && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Governance Model</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Decision Model</span>
                        <Badge className="capitalize">{community.governance_model.replace(/_/g, ' ')}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Votes Are Binding</span>
                        {community.governance_config?.votes_are_binding ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : (
                          <span className="text-slate-500">Advisory</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Quorum Required</span>
                        <span className="font-semibold">{community.governance_config?.quorum_required || 0}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Anonymous Voting</span>
                        {community.governance_config?.anonymous_voting_allowed ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : (
                          <span className="text-slate-500">Disabled</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="space-y-6">
                {/* Quick Stats */}
                <Card>
                  <CardHeader>
                    <CardTitle>Community Stats</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Participation Rate</span>
                      <span className="font-semibold">{community.participation_rate}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Transparency Score</span>
                      <span className="font-semibold">{community.transparency_score}/100</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Outcomes Followed</span>
                      <span className="font-semibold">{community.outcomes_followed_count}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Enabled Features */}
                {isMember && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Enabled Features</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {Object.entries(community.enabled_modules || {}).map(([module, enabled]) => 
                          enabled && (
                            <div key={module} className="flex items-center gap-2 text-sm text-slate-700">
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                              <span className="capitalize">{module.replace(/_/g, ' ')}</span>
                            </div>
                          )
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="polls">
            {!isMember && community.visibility === "private" ? (
              <Card><CardContent className="py-12 text-center text-slate-500">Join this community to see polls.</CardContent></Card>
            ) : polls.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <BarChart3 className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">No Polls Yet</h3>
                  <p className="text-slate-600 mb-6">Be the first to create a poll in this community</p>
                  {canManage && (
                    <Button onClick={() => navigate(createPageUrl("CreateCommunityPoll") + `?communityId=${communityId}`)}>
                      Create First Poll
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {canManage && (
                  <Button onClick={() => navigate(createPageUrl("CreateCommunityPoll") + `?communityId=${communityId}`)} className="mb-2">
                    + Create Poll
                  </Button>
                )}
                {polls.map((poll) => (
                  <Card key={poll.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-900 mb-2">{poll.question}</h3>
                          <div className="flex items-center gap-3 text-sm text-slate-600">
                            <span>{poll.total_votes} votes</span>
                            <Badge variant="outline" className="capitalize">{poll.outcome_type}</Badge>
                            <Badge className={poll.status === "open" ? "bg-green-500" : "bg-slate-500"}>
                              {poll.status}
                            </Badge>
                          </div>
                        </div>
                        {isMember && (
                          <Button variant="outline" size="sm" onClick={() => navigate(createPageUrl("PollDetail") + `?id=${poll.poll_id || poll.id}`)}>
                            Vote
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Petitions tab */}
          <TabsContent value="petitions">
            <div className="space-y-6">
              {/* Pending notifications for this member */}
              {isMember && pendingEndorsements.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">Community Petition Endorsements</h3>
                  <div className="space-y-3">
                    {pendingEndorsements.map(e => (
                      <CommunityPetitionNotification
                        key={e.id}
                        endorsement={e}
                        userId={user?.id}
                        onResponded={() => refetchMyResponses()}
                      />
                    ))}
                  </div>
                </div>
              )}

              {isMember && pendingEndorsements.length === 0 && !isAdmin && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 text-sm">No pending petition endorsements from your community.</p>
                  </CardContent>
                </Card>
              )}

              {/* Admin: endorse a petition */}
              {isAdmin && (
                <Card className="border-blue-200">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Star className="w-4 h-4 text-orange-500" />
                      Endorse a Petition for Your Community
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleEndorsePetition} className="space-y-3">
                      <div>
                        <Label className="text-sm text-slate-600">Petition ID *</Label>
                        <Input
                          placeholder="Paste the petition ID..."
                          value={endorsePetitionId}
                          onChange={e => setEndorsePetitionId(e.target.value)}
                          required
                        />
                        <p className="text-xs text-slate-400 mt-1">Find this in the petition's URL (e.g. ?id=abc123)</p>
                      </div>
                      <div>
                        <Label className="text-sm text-slate-600">Petition Title *</Label>
                        <Input
                          placeholder="Petition title shown to members..."
                          value={endorseTitle}
                          onChange={e => setEndorseTitle(e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <Label className="text-sm text-slate-600">Short Summary (optional)</Label>
                        <Textarea
                          placeholder="Brief description shown to members..."
                          value={endorseSummary}
                          onChange={e => setEndorseSummary(e.target.value)}
                          rows={2}
                        />
                      </div>
                      <Button type="submit" disabled={endorseLoading} className="w-full bg-blue-600 hover:bg-blue-700">
                        {endorseLoading ? "Endorsing..." : "Endorse & Notify All Members"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              )}

              {/* All endorsements history */}
              {endorsements.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">All Endorsed Petitions</h3>
                  <div className="space-y-2">
                    {endorsements.map(e => (
                      <Card key={e.id} className="border-slate-100">
                        <CardContent className="p-4 flex items-center justify-between">
                          <div>
                            <p className="font-medium text-slate-900 text-sm">{e.petition_title}</p>
                            {e.petition_summary && <p className="text-xs text-slate-500 mt-0.5">{e.petition_summary}</p>}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(createPageUrl("PetitionDetail") + `?id=${e.petition_id}`)}
                          >
                            View <ArrowLeft className="w-3 h-3 ml-1 rotate-180" />
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="members">
            <Card>
              <CardHeader>
                <CardTitle>Members ({members.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                          <Users className="w-5 h-5 text-slate-600" />
                        </div>
                        <div>
                          <div className="font-medium text-slate-900">User {member.user_id.slice(0, 8)}</div>
                          <div className="text-xs text-slate-500 capitalize">{member.role}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-slate-600">
                        <span>{member.votes_cast} votes</span>
                        <Badge variant="outline">{member.community_reputation} rep</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="discussions">
            <CommunityDiscussionsTab communityId={communityId} user={user} />
          </TabsContent>

          {canManage && (
            <TabsContent value="settings">
              <div className="space-y-6">
                <CommunityAccessCodeSettings communityId={communityId} user={user} />
              </div>
            </TabsContent>
          )}
        </Tabs>
        )}
        <Card className="border-slate-200 mt-4">
          <CardContent className="pt-4">
            <SocialShareButtons title={community?.name || "Community"} url={window.location.href} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}