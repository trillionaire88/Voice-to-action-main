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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Users,
  Settings,
  Calendar,
  CheckCircle2,
  Lock,
  Globe2,
  UserPlus,
  BarChart3,
  FileText,
  MessageSquare,
  ArrowLeft,
  Star,
  Key,
  UserCheck,
  UserX,
  ShieldAlert,
} from "lucide-react";
import CommunityPetitionNotification from "@/components/community/CommunityPetitionNotification";
import CommunityAccessCodeSettings from "@/components/community/CommunityAccessCodeSettings";
import CommunityDiscussionsTab from "@/components/community/CommunityDiscussionsTab";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import SocialShareButtons from "@/components/social/SocialShareButtons";
import { joinCommunityWithAccessCode, approveMember, rejectMember } from "@/api/communityApi";

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

  const { data: membership, refetch: refetchMembership } = useQuery({
    queryKey: ["communityMembership", communityId, user?.id],
    queryFn: async () => {
      const members = await api.entities.CommunityMember.filter({
        community_id: safeCommunityId,
        user_id: user.id,
      });
      return members[0] ?? null;
    },
    enabled: !!safeCommunityId && !!user,
  });

  // Only active members count
  const { data: members = [], refetch: refetchMembers } = useQuery({
    queryKey: ["communityMembers", communityId],
    queryFn: () => api.entities.CommunityMember.filter({ community_id: safeCommunityId, status: "active" }),
    enabled: !!safeCommunityId,
  });

  // Pending requests — only fetched for admins
  const isMember = membership?.status === "active";
  const isPendingApproval = membership?.status === "pending_approval";

  const { data: polls = [] } = useQuery({
    queryKey: ["communityPolls", safeCommunityId],
    queryFn: () => api.entities.CommunityPoll.filter({ community_id: safeCommunityId }),
    enabled: !!safeCommunityId && isMember,
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["communityRoles", safeCommunityId],
    queryFn: () => api.entities.CommunityRole.filter({ community_id: safeCommunityId }),
    enabled: !!safeCommunityId && isMember,
  });

  const { data: endorsements = [], refetch: refetchEndorsements } = useQuery({
    queryKey: ["communityEndorsements", safeCommunityId],
    queryFn: () => api.entities.CommunityPetitionEndorsement.filter({ community_id: safeCommunityId, status: "active" }),
    enabled: !!safeCommunityId && isMember,
  });

  const { data: myResponses = [], refetch: refetchMyResponses } = useQuery({
    queryKey: ["myPetitionResponses", safeCommunityId, user?.id],
    queryFn: () => api.entities.CommunityPetitionResponse.filter({ community_id: safeCommunityId, user_id: user.id }),
    enabled: !!safeCommunityId && !!user && isMember,
  });

  // Pending join requests — visible only to admins
  const isPlatformAdmin = user?.role === "admin" || user?.role === "owner_admin";
  const isOwner = community && (community.community_owner === user?.id || community.founder_user_id === user?.id);
  const effectivePlan = community ? (community.plan || community.community_plan || "free") : "free";
  const isPaidTier = effectivePlan === "paid" || effectivePlan === "private";
  const isPrivatePlan = effectivePlan === "private";
  const showPlanVerified = community?.verified_badge || community?.verified_community || community?.community_verified;
  const isAdmin = isOwner || isPlatformAdmin ||
    membership?.role === "founder" || membership?.role === "admin" ||
    (community?.community_admins || []).includes(user?.id);
  const canManage = isAdmin;

  const joinPolicy = community?.join_policy || "open";

  const { data: pendingRequests = [], refetch: refetchPending } = useQuery({
    queryKey: ["pendingRequests", safeCommunityId],
    queryFn: () => api.entities.CommunityMember.filter({ community_id: safeCommunityId, status: "pending_approval" }),
    enabled: !!safeCommunityId && canManage,
  });

  // Endorsements the current user hasn't responded to yet
  const pendingEndorsements = useMemo(() => {
    const respondedIds = new Set(myResponses.map(r => r.endorsement_id));
    return endorsements.filter(e => !respondedIds.has(e.id));
  }, [endorsements, myResponses]);

  // Endorsement form state
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
  const [codeValue, setCodeValue] = useState("");
  const [codeError, setCodeError] = useState("");
  const [codeLoading, setCodeLoading] = useState(false);

  // --- Join logic ---
  // open → immediate active membership
  // approval_required → pending_approval (admin must approve)
  // invite_only / private plan → must supply access code → active membership
  const handleJoinCommunity = async () => {
    if (!user) {
      navigate(createPageUrl("Profile"));
      return;
    }
    if (joinPolicy === "invite_only" || isPrivatePlan) {
      setShowCodeInput(true);
      return;
    }
    if (joinPolicy === "approval_required") {
      requestMutation.mutate();
      return;
    }
    // open
    openJoinMutation.mutate();
  };

  // Direct join — status: active
  const openJoinMutation = useMutation({
    mutationFn: async () => {
      return await api.entities.CommunityMember.create({
        community_id: communityId,
        user_id: user.id,
        role: "member",
        status: "active",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communityMembership", communityId, user?.id] });
      queryClient.invalidateQueries({ queryKey: ["communityMembers", communityId] });
      toast.success("Joined community!");
    },
    onError: () => toast.error("Failed to join community"),
  });

  // Request to join — status: pending_approval
  const requestMutation = useMutation({
    mutationFn: async () => {
      return await api.entities.CommunityMember.create({
        community_id: communityId,
        user_id: user.id,
        role: "member",
        status: "pending_approval",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communityMembership", communityId, user?.id] });
      toast.success("Join request sent — the admin will review it");
    },
    onError: () => toast.error("Failed to send join request"),
  });

  // Code-based join (invite_only / private) — validates access code, then sets active
  const handleJoinWithCode = async (e) => {
    e.preventDefault();
    if (!codeValue.trim()) return;
    setCodeLoading(true);
    setCodeError("");
    try {
      await joinCommunityWithAccessCode(communityId, codeValue.trim());
      setShowCodeInput(false);
      setCodeValue("");
      queryClient.invalidateQueries({ queryKey: ["communityMembership", communityId, user?.id] });
      queryClient.invalidateQueries({ queryKey: ["communityMembers", communityId] });
      toast.success("Access code accepted — you are now a member!");
    } catch (err) {
      setCodeError(err.message || "Invalid or inactive access code");
    } finally {
      setCodeLoading(false);
    }
  };

  // Admin: approve a pending request
  const handleApprove = async (memberId) => {
    try {
      await approveMember(memberId);
      refetchPending();
      refetchMembers();
      toast.success("Member approved");
    } catch {
      toast.error("Failed to approve member");
    }
  };

  // Admin: reject a pending request
  const handleReject = async (memberId) => {
    try {
      await rejectMember(memberId);
      refetchPending();
      toast.success("Request rejected");
    } catch {
      toast.error("Failed to reject request");
    }
  };

  // Admin: toggle join policy
  const handleToggleJoinPolicy = async (newPolicy) => {
    if (isPrivatePlan) return; // Private plan is always invite_only — cannot be changed here
    try {
      await api.entities.Community.update(communityId, { join_policy: newPolicy });
      queryClient.invalidateQueries({ queryKey: ["community", safeCommunityId] });
      toast.success(`Join policy updated to: ${newPolicy.replace("_", " ")}`);
    } catch {
      toast.error("Failed to update join policy");
    }
  };

  if (isLoading || !community) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 space-y-4">
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const getCommunityTypeInfo = () => {
    const types = {
      general: { label: "General", color: "blue" },
      business: { label: "Business", color: "indigo" },
      company: { label: "Company", color: "indigo" },
      council: { label: "Council", color: "red" },
      government: { label: "Government", color: "rose" },
      gym: { label: "Gym", color: "orange" },
      school: { label: "School", color: "green" },
      organisation: { label: "Organisation", color: "teal" },
      private: { label: "Private", color: "purple" },
      public_community: { label: "Public Community", color: "blue" },
      private_community: { label: "Private Community", color: "purple" },
      educational: { label: "Educational", color: "green" },
      corporate_business: { label: "Corporate/Business", color: "indigo" },
      council_local_government: { label: "Local Government", color: "red" },
      regional_government: { label: "Regional Government", color: "orange" },
      national_government: { label: "National Government", color: "rose" },
      political_figure_party: { label: "Political", color: "violet" },
      ngo_charity: { label: "NGO/Charity", color: "pink" },
      media_journalism: { label: "Media", color: "cyan" },
      temporary_event: { label: "Event", color: "amber" },
      experimental_pilot: { label: "Experimental", color: "slate" },
    };
    return types[community.community_type] || types.general;
  };

  const typeInfo = getCommunityTypeInfo();

  const joinButtonLabel = () => {
    if (isPrivatePlan || joinPolicy === "invite_only") return "Join with Code";
    if (joinPolicy === "approval_required") return "Request to Join";
    return "Join Community";
  };

  const joinButtonPending = openJoinMutation.isPending || requestMutation.isPending;

  // Determine content visibility: non-members can't see private community content at all
  const isPrivateGated = isPrivatePlan && !isMember && !isAdmin;

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
              <img src={community.logo_url} alt={community.community_name || community.name} className="w-20 h-20 rounded-xl object-cover" />
            ) : (
              <div className="w-20 h-20 rounded-xl bg-white/10 flex items-center justify-center">
                {isPrivatePlan ? <Lock className="w-10 h-10 text-white/60" /> : <Users className="w-10 h-10 text-white/60" />}
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
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Verified
                      </Badge>
                    )}
                    {effectivePlan === "paid" && (
                      <Badge className="bg-blue-500 text-white">Paid</Badge>
                    )}
                    {isPrivatePlan && (
                      <Badge className="bg-purple-600 text-white">
                        <Lock className="w-3 h-3 mr-1" /> Private
                      </Badge>
                    )}
                    {effectivePlan === "free" && (
                      <Badge variant="outline" className="text-white border-white/40 bg-white/10">Free</Badge>
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
                    {/* Show join button only if not already a member / pending */}
                    {!isMember && !isPendingApproval && (
                      <Button
                        onClick={handleJoinCommunity}
                        disabled={joinButtonPending}
                        className="bg-white text-slate-900 hover:bg-slate-100"
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        {joinButtonLabel()}
                      </Button>
                    )}
                    {isPendingApproval && (
                      <Badge className="bg-amber-500 text-white px-3 py-1">Pending Approval</Badge>
                    )}
                    {(isOwner || isPlatformAdmin) && (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => navigate(`/EditCommunity?id=${communityId}`)}
                          className="border-white bg-white/20 text-white hover:bg-white/30 font-semibold"
                        >
                          <Settings className="w-4 h-4 mr-2" /> Manage
                        </Button>
                        {isOwner && effectivePlan === "free" && (
                          <Button
                            className="bg-amber-500 text-slate-900 hover:bg-amber-400 font-semibold"
                            onClick={() => navigate(`/community-subscription?community_id=${communityId}`)}
                          >
                            Upgrade
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Only show description publicly if community is not private-plan */}
              {!isPrivatePlan && (
                <p className="text-blue-100 text-lg">{community.community_description || community.description_public}</p>
              )}
              {isPrivatePlan && !isMember && (
                <p className="text-blue-100 text-lg">This is a private community. Join to see content.</p>
              )}

              {/* Code input inline */}
              {showCodeInput && !isMember && (
                <div className="mt-4 max-w-sm bg-white/10 rounded-xl p-4">
                  <p className="text-white text-sm font-semibold mb-3 flex items-center gap-2">
                    <Key className="w-4 h-4" /> Enter your invite code
                  </p>
                  <form onSubmit={handleJoinWithCode} className="space-y-2">
                    <input
                      value={codeValue}
                      onChange={e => { setCodeValue(e.target.value.toUpperCase()); setCodeError(""); }}
                      placeholder="XXXXXXXX"
                      maxLength={16}
                      className="w-full px-3 py-2 rounded-lg bg-white/20 text-white placeholder-white/50 font-mono text-center tracking-widest text-lg border border-white/30 focus:outline-none focus:border-white"
                    />
                    {codeError && <p className="text-red-300 text-xs">{codeError}</p>}
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={codeLoading || !codeValue.trim()}
                        className="flex-1 bg-white text-slate-900 font-semibold rounded-lg py-2 text-sm disabled:opacity-50"
                      >
                        {codeLoading ? "Verifying…" : "Join with Code"}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowCodeInput(false); setCodeValue(""); setCodeError(""); }}
                        className="text-white/60 text-xs px-3 hover:text-white"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Stats — hide member count details for private non-members */}
              <div className="flex gap-6 mt-6">
                {(!isPrivateGated) && (
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-300" />
                    <span className="font-semibold">{community.member_count}</span>
                    <span className="text-blue-200 text-sm">members</span>
                  </div>
                )}
                {isMember && (
                  <>
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
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-amber-300" />
                      <span className="font-semibold">{community.post_count ?? 0}</span>
                      <span className="text-blue-200 text-sm">posts</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* ── Private gate: non-members see nothing except the join prompt ── */}
        {isPrivateGated && (
          <div className="py-20 text-center">
            <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <Lock className="w-10 h-10 text-purple-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">Private Community</h2>
            <p className="text-slate-600 max-w-md mx-auto mb-6">
              This community is invite-only. You need a valid access code from the community admin to join.
            </p>
            {user ? (
              isPendingApproval ? (
                <Badge className="bg-amber-500 text-white px-4 py-2 text-base">Request Pending — awaiting admin approval</Badge>
              ) : (
                <Button
                  onClick={() => setShowCodeInput(true)}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Key className="w-4 h-4 mr-2" />
                  Enter Invite Code
                </Button>
              )
            ) : (
              <Button onClick={() => navigate(createPageUrl("Profile"))}>Sign In to Request Access</Button>
            )}

            {/* Inline code form for private gate */}
            {showCodeInput && !isMember && (
              <div className="mt-6 max-w-sm mx-auto bg-purple-50 border border-purple-200 rounded-xl p-4">
                <form onSubmit={handleJoinWithCode} className="space-y-3">
                  <input
                    value={codeValue}
                    onChange={e => { setCodeValue(e.target.value.toUpperCase()); setCodeError(""); }}
                    placeholder="XXXXXXXX"
                    maxLength={16}
                    className="w-full px-3 py-3 rounded-lg border border-purple-300 text-slate-900 font-mono text-center tracking-widest text-lg focus:outline-none focus:border-purple-600"
                  />
                  {codeError && <p className="text-red-600 text-sm">{codeError}</p>}
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={codeLoading || !codeValue.trim()}
                      className="flex-1 bg-purple-600 text-white font-semibold rounded-lg py-2 text-sm disabled:opacity-50"
                    >
                      {codeLoading ? "Verifying…" : "Join with Code"}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowCodeInput(false); setCodeValue(""); setCodeError(""); }}
                      className="text-slate-500 text-sm px-3 hover:text-slate-700"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* Pending approval message for non-private communities */}
        {isPendingApproval && !isPrivatePlan && (
          <Alert className="mb-6 border-amber-200 bg-amber-50">
            <ShieldAlert className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-900">
              Your join request is pending approval by the community admin.
            </AlertDescription>
          </Alert>
        )}

        {/* Analytics strip for paid members */}
        {isPaidTier && isMember && (
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

        {/* Main tabs — only shown to members (and admins for management) */}
        {(isMember || isAdmin) && !isPrivateGated && (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full border-b border-slate-200 bg-transparent rounded-none p-0 h-auto mb-6">
              <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-slate-500 hover:text-slate-700 font-medium px-4 py-3 text-sm">Overview</TabsTrigger>
              <TabsTrigger value="polls" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-slate-500 hover:text-slate-700 font-medium px-4 py-3 text-sm">Polls</TabsTrigger>
              <TabsTrigger value="petitions" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-slate-500 hover:text-slate-700 font-medium px-4 py-3 text-sm">
                Petitions {pendingEndorsements.length > 0 && (
                  <span className="ml-1.5 bg-amber-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{pendingEndorsements.length}</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="members" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-slate-500 hover:text-slate-700 font-medium px-4 py-3 text-sm">Members</TabsTrigger>
              <TabsTrigger value="discussions" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-slate-500 hover:text-slate-700 font-medium px-4 py-3 text-sm">Discussions</TabsTrigger>
              {canManage && (
                <TabsTrigger value="settings" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-slate-500 hover:text-slate-700 font-medium px-4 py-3 text-sm">
                  Settings
                  {pendingRequests.length > 0 && (
                    <span className="ml-1.5 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{pendingRequests.length}</span>
                  )}
                </TabsTrigger>
              )}
            </TabsList>

            {/* Overview */}
            <TabsContent value="overview">
              <div className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                  <Card>
                    <CardHeader><CardTitle>About</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-sm text-slate-700 mb-2">Description</h4>
                        <p className="text-slate-600">{community.community_description || community.description_public}</p>
                      </div>
                      {community.description_internal && (
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

                  {community.governance_model && (
                    <Card>
                      <CardHeader><CardTitle>Governance Model</CardTitle></CardHeader>
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
                      </CardContent>
                    </Card>
                  )}
                </div>

                <div className="space-y-6">
                  <Card>
                    <CardHeader><CardTitle>Community Stats</CardTitle></CardHeader>
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

                  {community.enabled_modules && (
                    <Card>
                      <CardHeader><CardTitle>Enabled Features</CardTitle></CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {Object.entries(community.enabled_modules).map(([module, enabled]) =>
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

            {/* Polls */}
            <TabsContent value="polls">
              {polls.length === 0 ? (
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
                          <Button variant="outline" size="sm" onClick={() => navigate(createPageUrl("PollDetail") + `?id=${poll.poll_id || poll.id}`)}>
                            Vote
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Petitions */}
            <TabsContent value="petitions">
              <div className="space-y-6">
                {pendingEndorsements.length > 0 && (
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
                {pendingEndorsements.length === 0 && !isAdmin && (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500 text-sm">No pending petition endorsements.</p>
                    </CardContent>
                  </Card>
                )}
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
                          <Input placeholder="Paste the petition ID…" value={endorsePetitionId} onChange={e => setEndorsePetitionId(e.target.value)} required />
                          <p className="text-xs text-slate-400 mt-1">Find this in the petition's URL</p>
                        </div>
                        <div>
                          <Label className="text-sm text-slate-600">Petition Title *</Label>
                          <Input placeholder="Title shown to members…" value={endorseTitle} onChange={e => setEndorseTitle(e.target.value)} required />
                        </div>
                        <div>
                          <Label className="text-sm text-slate-600">Short Summary (optional)</Label>
                          <Textarea placeholder="Brief description…" value={endorseSummary} onChange={e => setEndorseSummary(e.target.value)} rows={2} />
                        </div>
                        <Button type="submit" disabled={endorseLoading} className="w-full bg-blue-600 hover:bg-blue-700">
                          {endorseLoading ? "Endorsing…" : "Endorse & Notify All Members"}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                )}
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
                            <Button size="sm" variant="outline" onClick={() => navigate(createPageUrl("PetitionDetail") + `?id=${e.petition_id}`)}>
                              View
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Members */}
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
                    {members.length === 0 && (
                      <p className="text-slate-500 text-sm text-center py-6">No active members yet.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Discussions */}
            <TabsContent value="discussions">
              <CommunityDiscussionsTab communityId={communityId} user={user} />
            </TabsContent>

            {/* Settings (admin only) */}
            {canManage && (
              <TabsContent value="settings">
                <div className="space-y-6">

                  {/* Join Policy Toggle */}
                  {!isPrivatePlan && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <UserPlus className="w-4 h-4 text-blue-600" />
                          Join Policy
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-sm text-slate-500">Control how new members join this community.</p>
                        <div className="flex flex-col gap-3">
                          {[
                            { value: "open", label: "Open — anyone can join instantly", desc: "No approval needed. Members join with one click." },
                            { value: "approval_required", label: "Approval Required — admin reviews requests", desc: "Members send a request; you approve or reject." },
                            { value: "invite_only", label: "Invite Only — access code required", desc: "Members must have an access code to join." },
                          ].map(opt => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => handleToggleJoinPolicy(opt.value)}
                              className={`p-3 rounded-lg border-2 text-left transition-all ${
                                joinPolicy === opt.value
                                  ? "border-blue-500 bg-blue-50"
                                  : "border-slate-200 hover:border-slate-300 bg-white"
                              }`}
                            >
                              <p className={`font-semibold text-sm ${joinPolicy === opt.value ? "text-blue-800" : "text-slate-800"}`}>
                                {joinPolicy === opt.value && <CheckCircle2 className="w-3 h-3 inline mr-1.5 text-blue-600" />}
                                {opt.label}
                              </p>
                              <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
                            </button>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {isPrivatePlan && (
                    <Card className="border-purple-200 bg-purple-50">
                      <CardContent className="pt-4 flex items-center gap-3">
                        <Lock className="w-5 h-5 text-purple-600 flex-shrink-0" />
                        <p className="text-sm text-purple-900">
                          Private communities are always invite-only. Manage your access codes below to control membership.
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Pending join requests */}
                  {joinPolicy === "approval_required" && !isPrivatePlan && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <UserCheck className="w-4 h-4 text-amber-600" />
                          Pending Join Requests
                          {pendingRequests.length > 0 && (
                            <Badge className="bg-amber-500 text-white ml-1">{pendingRequests.length}</Badge>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {pendingRequests.length === 0 ? (
                          <p className="text-sm text-slate-500 text-center py-4">No pending requests.</p>
                        ) : (
                          <div className="space-y-3">
                            {pendingRequests.map(req => (
                              <div key={req.id} className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                <div>
                                  <p className="text-sm font-medium text-slate-900 font-mono">{req.user_id.slice(0, 12)}…</p>
                                  <p className="text-xs text-slate-500">Requested to join</p>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700"
                                    onClick={() => handleApprove(req.id)}
                                  >
                                    <UserCheck className="w-3 h-3 mr-1" /> Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-red-300 text-red-600 hover:bg-red-50"
                                    onClick={() => handleReject(req.id)}
                                  >
                                    <UserX className="w-3 h-3 mr-1" /> Reject
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Access codes */}
                  <CommunityAccessCodeSettings communityId={communityId} user={user} />
                </div>
              </TabsContent>
            )}
          </Tabs>
        )}

        {/* Show limited public view for non-private, non-member communities */}
        {!isMember && !isAdmin && !isPrivateGated && (
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>About</CardTitle></CardHeader>
              <CardContent>
                <p className="text-slate-600">{community.community_description || community.description_public}</p>
                {community.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {community.tags.map((tag) => (
                      <Badge key={tag} variant="outline">{tag}</Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            {!isPendingApproval && (
              <div className="text-center py-6">
                <p className="text-slate-500 mb-4">Join this community to access discussions, polls, and more.</p>
                {user ? (
                  <Button onClick={handleJoinCommunity} disabled={joinButtonPending} className="bg-purple-600 hover:bg-purple-700">
                    <UserPlus className="w-4 h-4 mr-2" />
                    {joinButtonLabel()}
                  </Button>
                ) : (
                  <Button onClick={() => navigate(createPageUrl("Profile"))}>Sign In to Join</Button>
                )}
              </div>
            )}
          </div>
        )}

        <Card className="border-slate-200 mt-4">
          <CardContent className="pt-4">
            <SocialShareButtons title={community?.community_name || community?.name || "Community"} url={window.location.href} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
