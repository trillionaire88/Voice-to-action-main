import React, { useState, useEffect } from "react";
import { api } from '@/api/client';
import { supabase } from "@/lib/supabase";
import HeaderCustomizer from "@/components/header/HeaderCustomizer";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ProfileCustomizer from "../components/profile/ProfileCustomizer";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { communityName, communityDescriptionPublic } from "@/lib/communityFields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  User,
  MapPin,
  Calendar,
  BarChart3,
  Edit,
  Save,
  X,
  Globe2,
  MessageSquare,
  Award,
  Users as UsersIcon,
  Star,
  TrendingUp,
  Settings,
  Upload,
  Mail,
  Phone,
  FileText,
  PenLine,
  Trash2,
  Tag,
} from "lucide-react";
import ProfileAvatar from "../components/profile/ProfileAvatar";
import VerificationBadge from "../components/profile/VerificationBadge";
import FollowButton from "@/components/FollowButton";
import MessageButton from "@/components/MessageButton";
import FollowingList from "../components/profile/FollowingList";
import ActivityFeed from "@/components/social/ActivityFeed";
import { format } from "date-fns";
import { toast } from "sonner";
import { sanitiseText } from "@/lib/sanitise";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonProfile } from "@/components/ui/SkeletonCard";
import PollCard from "../components/polls/PollCard";
import UserRatingPanel from "../components/reputation/UserRatingPanel";
import ReputationBadge from "../components/reputation/ReputationBadge";
import ReputationScoreCard from "../components/reputation/ReputationScoreCard";
import ProfileCompletionCard from "@/components/profile/ProfileCompletionCard";
import FormErrorHandler from "@/components/ui/FormErrorHandler";

export default function Profile() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const profileUserId = urlParams.get("userId");
  
  const { user: currentUser, refreshUser, isLoadingAuth } = useAuth();
  const [editing, setEditing] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savedReferralCode, setSavedReferralCode] = useState(null);
  const [referralCodeInput, setReferralCodeInput] = useState("");
  const [savingCode, setSavingCode] = useState(false);
  
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");

  // Handle return from Stripe checkout for identity_verification payment
  useEffect(() => {
    if (!currentUser) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("verified") === "1" && !currentUser.is_verified) {
      api.entities.VerificationRequest.filter({ user_id: currentUser.id })
        .then(async (reqs) => {
          const alreadyPaid = reqs.some(r => r.payment_status === "completed");
          if (!alreadyPaid) {
            await api.entities.VerificationRequest.create({
              user_id: currentUser.id,
              verification_type: "identity",
              full_name: currentUser.full_name || currentUser.display_name || "",
              status: "pending",
              payment_status: "completed",
              payment_amount: 12.99,
              payment_reference: `STRIPE-CHECKOUT-${Date.now()}`,
            });
            toast.success("✅ Payment received! Your verification request is now pending review.");
            window.history.replaceState({}, "", window.location.pathname);
            refreshUser();
          }
        });
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser?.id) return;
    supabase
      .from("profiles")
      .select("saved_referral_code")
      .eq("id", currentUser.id)
      .single()
      .then(({ data }) => {
        if (data?.saved_referral_code) setSavedReferralCode(data.saved_referral_code);
      });
  }, [currentUser?.id]);

  const handleSaveReferralCode = async () => {
    if (!referralCodeInput.trim() || !currentUser?.id) return;
    setSavingCode(true);
    try {
      const { data: codes } = await supabase
        .from("referral_codes")
        .select("code, active, owner_user_id")
        .eq("code", referralCodeInput.trim().toUpperCase())
        .eq("active", true)
        .limit(1);

      if (!codes || codes.length === 0) {
        toast.error("Invalid or inactive referral code. Please check and try again.");
        return;
      }

      if (codes[0].owner_user_id === currentUser.id) {
        toast.error("You cannot save your own referral code.");
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .update({ saved_referral_code: codes[0].code })
        .eq("id", currentUser.id);

      if (error) throw error;

      setSavedReferralCode(codes[0].code);
      setReferralCodeInput("");
      toast.success(`Referral code ${codes[0].code} saved! You'll get 5% off at checkout.`);
    } catch (err) {
      toast.error(err.message || "Failed to save referral code");
    } finally {
      setSavingCode(false);
    }
  };

  const handleRemoveSavedCode = async () => {
    if (!currentUser?.id) return;
    setSavingCode(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ saved_referral_code: null })
        .eq("id", currentUser.id);

      if (error) throw error;
      setSavedReferralCode(null);
      toast.success("Referral code removed.");
    } catch (err) {
      toast.error(err.message || "Failed to remove code");
    } finally {
      setSavingCode(false);
    }
  };

  const targetUserId = profileUserId || currentUser?.id;
  const isOwnProfile = currentUser && targetUserId === currentUser.id;

  // For own profile, use currentUser directly — avoids User entity security restrictions
  // For other users' profiles, query the entity
  const { data: queriedProfileUser, isLoading: loadingOtherProfile, isFetched: otherProfileFetched } = useQuery({
    queryKey: ["user", targetUserId],
    queryFn: async () => {
      try {
        const users = await api.entities.User.filter({ id: targetUserId });
        return users[0];
      } catch {
        return null;
      }
    },
    enabled: !!profileUserId && !!targetUserId,
  });

  const profileUser = profileUserId ? queriedProfileUser : currentUser;

  const [otherProfileTimedOut, setOtherProfileTimedOut] = useState(false);
  useEffect(() => {
    if (!profileUserId || profileUser) {
      setOtherProfileTimedOut(false);
      return;
    }
    const t = setTimeout(() => setOtherProfileTimedOut(true), 5000);
    return () => clearTimeout(t);
  }, [profileUserId, profileUser]);

  const { data: createdPolls = [] } = useQuery({
    queryKey: ["userPolls", targetUserId],
    queryFn: async () => {
      if (!profileUser) return [];
      const polls = await api.entities.Poll.filter(
        { creator_user_id: targetUserId },
        "-created_date"
      );

      // Filter out anonymous polls unless it's own profile
      if (!isOwnProfile) {
        return polls.filter(p => !p.is_anonymous_display);
      }
      return polls;
    },
    enabled: !!profileUser,
    staleTime: 2 * 60_000,
  });

  const { data: myVotes = [] } = useQuery({
    queryKey: ["myVotes", targetUserId],
    queryFn: async () => {
      if (!profileUser) return [];
      return await api.entities.Vote.filter({ user_id: targetUserId });
    },
    enabled: !!profileUser,
    staleTime: 5 * 60_000,
  });

  const { data: comments = [] } = useQuery({
    queryKey: ["userComments", targetUserId],
    queryFn: async () => {
      if (!profileUser) return [];
      const allComments = await api.entities.Comment.filter(
        { author_user_id: targetUserId },
        "-created_date"
      );
      // Filter out anonymous comments unless it's own profile
      if (!isOwnProfile) {
        return allComments.filter(c => !c.is_anonymous_display);
      }
      return allComments;
    },
    enabled: !!profileUser,
    staleTime: 2 * 60_000,
  });

  const { data: votedPolls = [] } = useQuery({
    queryKey: ["votedPolls", myVotes.map(v => v.poll_id).join(",")],
    queryFn: async () => {
      if (myVotes.length === 0) return [];
      const pollIds = [...new Set(myVotes.map((v) => v.poll_id))];
      const results = await Promise.all(
        pollIds.slice(0, 20).map(id =>
          api.entities.Poll.filter({ id }).then(r => r[0]).catch(() => null)
        )
      );
      return results.filter(Boolean);
    },
    enabled: myVotes.length > 0,
    staleTime: 5 * 60_000,
  });

  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "owner_admin";

  const { data: createdPetitions = [] } = useQuery({
    queryKey: ["userCreatedPetitions", targetUserId, isAdmin],
    queryFn: async () => {
      const all = await api.entities.Petition.filter({ creator_user_id: targetUserId }, "-created_date");
      // Hide anonymous petitions from public view (show to creator + admin only)
      if (isOwnProfile || isAdmin) return all;
      return all.filter(p => p.creator_visible !== false);
    },
    enabled: !!targetUserId,
  });

  const { data: signedPetitions = [] } = useQuery({
    queryKey: ["userSignedPetitions", targetUserId],
    queryFn: async () => {
      const sigs = await api.entities.PetitionSignature.filter({ user_id: targetUserId });
      if (sigs.length === 0) return [];
      const petitionIds = [...new Set(sigs.map(s => s.petition_id))];
      const all = await api.entities.Petition.list();
      return all.filter(p => petitionIds.includes(p.id));
    },
    enabled: !!targetUserId,
  });

  const { data: ownedCommunities = [] } = useQuery({
    queryKey: ["ownedCommunities", targetUserId],
    queryFn: () => api.entities.Community.filter({ founder_user_id: targetUserId }),
    enabled: !!targetUserId,
  });

  const { data: memberships = [] } = useQuery({
    queryKey: ["communityMemberships", targetUserId],
    queryFn: () => api.entities.CommunityMember.filter({ user_id: targetUserId }),
    enabled: !!targetUserId,
  });

  const { data: followerCount = 0 } = useQuery({
    queryKey: ["followers", targetUserId],
    queryFn: async () => {
      const followers = await api.entities.UserFollow.filter({ target_type: "user", target_id: targetUserId });
      return followers.length;
    },
    enabled: !!targetUserId,
    staleTime: 60_000,
  });

  const { data: followingCount = 0 } = useQuery({
    queryKey: ["following", targetUserId],
    queryFn: async () => {
      const following = await api.entities.UserFollow.filter({ follower_id: targetUserId, target_type: "user" });
      return following.length;
    },
    enabled: !!targetUserId,
    staleTime: 60_000,
  });

  const deletePollMutation = useMutation({
    mutationFn: (pollId) => api.entities.Poll.delete(pollId),
    onSuccess: () => {
      toast.success("Poll deleted");
      queryClient.invalidateQueries(["userPolls", targetUserId]);
    },
    onError: () => toast.error("Failed to delete poll"),
  });

  const deletePetitionMutation = useMutation({
    mutationFn: (petitionId) => api.entities.Petition.delete(petitionId),
    onSuccess: () => {
      toast.success("Petition deleted");
      queryClient.invalidateQueries(["userCreatedPetitions", targetUserId]);
    },
    onError: () => toast.error("Failed to delete petition"),
  });

  const handleDeletePoll = (e, pollId) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this poll? This cannot be undone.")) {
      deletePollMutation.mutate(pollId);
    }
  };

  const handleDeletePetition = (e, petitionId) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this petition? This cannot be undone.")) {
      deletePetitionMutation.mutate(petitionId);
    }
  };

  const updateProfileMutation = useMutation({
    mutationFn: async (data) => {
      const base = data || { display_name: displayName, bio: bio };
      const safe = { ...base };
      if (safe.display_name != null) safe.display_name = sanitiseText(String(safe.display_name), 200);
      if (safe.bio != null) safe.bio = sanitiseText(String(safe.bio), 5000);
      return await api.auth.updateMe(safe);
    },
    onSuccess: () => {
      toast.success("Profile updated successfully!");
      setEditing(false);
      refreshUser();
      queryClient.invalidateQueries(["user"]);
    },
    onError: () => {
      toast.error("Failed to update profile");
    },
  });

  const handleSave = () => {
    const name = sanitiseText(displayName, 200);
    if (!name.trim()) {
      toast.error("Display name is required");
      return;
    }
    updateProfileMutation.mutate({ display_name: name, bio: sanitiseText(bio, 5000) });
  };

  const handleCancel = () => {
    setDisplayName(currentUser.display_name || "");
    setBio(currentUser.bio || "");
    setEditing(false);
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Please upload a JPEG, PNG, WebP, or GIF image");
      e.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5MB");
      e.target.value = "";
      return;
    }

    setUploadingAvatar(true);
    try {
      const { file_url } = await api.integrations.Core.UploadFile({ file });
      await updateProfileMutation.mutateAsync({ profile_avatar_url: file_url });
      toast.success("Profile picture updated!");
    } catch (error) {
      toast.error("Failed to upload image");
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (!profileUserId) {
    if (isLoadingAuth) {
      return (
        <div className="w-full py-12">
          <SkeletonProfile />
        </div>
      );
    }
    if (!currentUser) {
      return (
        <div className="w-full py-16 text-center space-y-4">
          <p className="text-slate-600">Sign in to view your profile.</p>
          <Button onClick={() => navigate(`${createPageUrl("Home")}?signin=1`)}>Sign in</Button>
        </div>
      );
    }
  }

  if (profileUserId && !profileUser && loadingOtherProfile && !otherProfileTimedOut) {
    return (
      <div className="w-full py-12">
        <SkeletonProfile />
      </div>
    );
  }

  if (profileUserId && !profileUser && (otherProfileTimedOut || (otherProfileFetched && !loadingOtherProfile))) {
    return (
      <div className="w-full py-16 text-center space-y-4 text-slate-600">
        <p>Profile not found.</p>
        <Button variant="outline" onClick={() => navigate(createPageUrl("Home"))}>Back to Home</Button>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="w-full py-12">
        <SkeletonProfile />
      </div>
    );
  }

  const votedPollIds = new Set(myVotes.map((v) => v.poll_id));

  return (
    <div className="w-full py-4 sm:py-6">
      {/* Profile Header */}
      <Card className="border-slate-200 shadow-sm mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Avatar */}
            <div className="flex-shrink-0 relative group">
              <ProfileAvatar user={profileUser} size="xl" showBadge={true} />
              {isOwnProfile && (profileUser.is_email_verified || profileUser.is_phone_verified || profileUser.is_verified || profileUser.is_public_figure) ? (
                <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-full">
                  <Upload className="w-6 h-6 text-white" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                    disabled={uploadingAvatar}
                  />
                </label>
              ) : isOwnProfile ? (
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-not-allowed rounded-full text-center px-2"
                  title="Verify your email to upload a profile picture"
                >
                  <Upload className="w-5 h-5 text-slate-300 mb-1" />
                  <span className="text-white text-[10px] leading-tight font-medium">Verify first</span>
                </div>
              ) : null}
            </div>

            {/* Info */}
            <div className="flex-1">
              {editing ? (
                <div className="space-y-4">
                  <div>
                    <Label>Display Name</Label>
                    <Input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      maxLength={50}
                    />
                  </div>
                  <div>
                    <Label>Bio</Label>
                    <Textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Tell us about yourself..."
                      rows={3}
                      maxLength={200}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSave}
                      disabled={updateProfileMutation.isPending}
                      size="sm"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleCancel}
                      size="sm"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                  <FormErrorHandler error={updateProfileMutation.isError ? updateProfileMutation.error : null} />
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h1 className="text-2xl font-bold text-slate-900">
                      {profileUser.display_name || profileUser.full_name || "User"}
                    </h1>
                    <VerificationBadge user={profileUser} size="lg" showLabel={true} />
                    {profileUser.role === "moderator" && (
                      <Badge className="bg-orange-50 text-orange-700 border-orange-200">
                        Moderator
                      </Badge>
                    )}
                    {profileUser.role === "admin" && (
                      <Badge className="bg-purple-50 text-purple-700 border-purple-200">
                        Admin
                      </Badge>
                    )}
                    <ReputationBadge score={profileUser.reputation_score_overall} />
                  </div>

                  {profileUser.bio && (
                    <p className="text-slate-600 mb-3">{profileUser.bio}</p>
                  )}

                  <div className="flex flex-wrap gap-4 text-sm text-slate-600 mb-4">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      <span>{profileUser.country_code}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span>
                        Joined {format(new Date(profileUser.created_date), "MMMM yyyy")}
                      </span>
                    </div>
                    {profileUser.age_bracket && profileUser.age_bracket !== "prefer_not_to_say" && (
                      <div className="flex items-center gap-1.5">
                        <User className="w-4 h-4 text-slate-400" />
                        <span>Age {profileUser.age_bracket}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    {isOwnProfile ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditing(true);
                            setDisplayName(profileUser.display_name || "");
                            setBio(profileUser.bio || "");
                          }}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Profile
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCustomizing(!customizing)}
                        >
                          <Settings className="w-4 h-4 mr-2" />
                          Customize
                        </Button>
                        {!profileUser.is_verified && (
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700"
                            onClick={() => navigate(createPageUrl("GetVerified"))}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Get Blue ✓ ($12.99)
                          </Button>
                        )}
                        {!profileUser.is_public_figure && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                            onClick={() => navigate(createPageUrl("PublicFigureApplication"))}
                          >
                            <Star className="w-4 h-4 mr-2 text-yellow-500" />
                            Apply for Gold ★
                          </Button>
                        )}
                      </>
                    ) : (
                      <div className="flex gap-2 flex-wrap">
                        <FollowButton targetUserId={profileUser.id} targetName={profileUser.display_name || profileUser.full_name} />
                        <MessageButton targetUserId={profileUser.id} />
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Stats */}
            <div className="flex md:flex-col gap-6 md:gap-4">
              <div className="text-center md:text-right">
                <div className="text-3xl font-bold text-blue-600">
                  {followerCount}
                </div>
                <div className="text-sm text-slate-600">Followers</div>
              </div>
              <div className="text-center md:text-right">
                <div className="text-3xl font-bold text-purple-600">
                  {followingCount}
                </div>
                <div className="text-sm text-slate-600">Following</div>
              </div>
              <div className="text-center md:text-right">
                <div className="text-3xl font-bold text-green-600">
                  {profileUser.polls_created_count || 0}
                </div>
                <div className="text-sm text-slate-600">Polls</div>
              </div>
            </div>
          </div>

          {/* Reputation Scores */}
          {(profileUser.reputation_score_overall > 0 || 
            profileUser.reputation_score_constructive > 0 ||
            profileUser.reputation_score_respectful > 0) && (
            <>
              <Separator className="my-6" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {profileUser.reputation_score_constructive > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <Star className="w-4 h-4 text-amber-500" />
                    <span className="text-slate-600">Constructive:</span>
                    <span className="font-semibold text-slate-900">
                      {profileUser.reputation_score_constructive.toFixed(1)}
                    </span>
                  </div>
                )}
                {profileUser.reputation_score_respectful > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <Star className="w-4 h-4 text-emerald-500" />
                    <span className="text-slate-600">Respectful:</span>
                    <span className="font-semibold text-slate-900">
                      {profileUser.reputation_score_respectful.toFixed(1)}
                    </span>
                  </div>
                )}
                {profileUser.reputation_score_well_reasoned > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <Star className="w-4 h-4 text-blue-500" />
                    <span className="text-slate-600">Well-reasoned:</span>
                    <span className="font-semibold text-slate-900">
                      {profileUser.reputation_score_well_reasoned.toFixed(1)}
                    </span>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Profile Completion Prompt */}
      {isOwnProfile && !editing && (
        <ProfileCompletionCard
          user={profileUser}
          onEditProfile={() => {
            setEditing(true);
            setDisplayName(profileUser.display_name || "");
            setBio(profileUser.bio || "");
          }}
        />
      )}

      {/* Blue Checkmark Verification Section */}
      {isOwnProfile && !profileUser?.is_verified && (
        <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 mb-6">
          <CardContent className="pt-5 pb-5">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md shadow-blue-200">
                <CheckCircle2 className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h3 className="text-lg font-bold text-slate-900 mb-1">
                  Get Your Blue ✓ Checkmark — $12.99 AUD
                </h3>
                <p className="text-sm text-slate-600">
                  Verify your identity for a trusted blue badge. Verified accounts unlock profile picture uploads, increased credibility, and higher platform trust scores.
                </p>
              </div>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold whitespace-nowrap"
                onClick={() => navigate(createPageUrl("GetVerified"))}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Get Verified
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Navigation Customiser ─────────────────────────────────── */}
      {isOwnProfile && (
        <Card className="border-slate-200 mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="w-4 h-4 text-slate-600" />
              Customise Navigation
            </CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Choose which pages appear in your navigation bar.
            </p>
          </CardHeader>
          <CardContent>
            <HeaderCustomizer user={currentUser} onSave={() => toast.success("Navigation saved!")} embedded />
          </CardContent>
        </Card>
      )}

      {/* ── Referral Code Section ─────────────────────────────────── */}
      {isOwnProfile && (
        <Card className="border-slate-200 mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Tag className="w-4 h-4 text-purple-600" />
              My Referral Code
            </CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Save a creator&apos;s referral code to get 5% off paid platform services automatically at checkout.
              Referral codes cannot be used on donations or gifts to the creator.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {savedReferralCode ? (
              <div className="flex items-center gap-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-mono font-bold text-purple-800 tracking-widest">{savedReferralCode}</p>
                  <p className="text-xs text-purple-600 mt-0.5">5% discount active at checkout</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-purple-300 text-purple-700 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                  onClick={handleRemoveSavedCode}
                  disabled={savingCode}
                >
                  Remove
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  value={referralCodeInput}
                  onChange={e => setReferralCodeInput(e.target.value.toUpperCase())}
                  placeholder="Enter creator referral code"
                  className="font-mono bg-white text-slate-900 border-slate-300 placeholder:text-slate-400"
                  maxLength={20}
                />
                <Button
                  onClick={handleSaveReferralCode}
                  disabled={savingCode || !referralCodeInput.trim()}
                  className="bg-purple-600 hover:bg-purple-700 shrink-0"
                >
                  {savingCode ? "Saving..." : "Save"}
                </Button>
              </div>
            )}
            <p className="text-xs text-amber-700">
              Referral codes do not apply to platform donations or personal gifts to the creator.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Customizer */}
      {isOwnProfile && customizing && (
        <div className="mb-6">
          <ProfileCustomizer
            user={profileUser}
            onSave={(data) => {
              updateProfileMutation.mutate(data);
              setCustomizing(false);
            }}
          />
        </div>
      )}

      {/* Reputation Score Card */}
      <ReputationScoreCard userId={targetUserId} isOwnProfile={isOwnProfile} />

      {/* User Rating (only on other users' profiles) */}
      {!isOwnProfile && currentUser && (
        <UserRatingPanel
          targetUser={profileUser}
          currentUser={currentUser}
        />
      )}

      {/* Tabs */}
      <Tabs defaultValue="created" className="space-y-6">
        <TabsList className="w-full border-b border-slate-200 bg-transparent rounded-none p-0 h-auto mb-6">
          <TabsTrigger value="created" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-slate-500 hover:text-slate-700 font-medium px-4 py-3 text-sm transition-all">
            <PenLine className="w-4 h-4 mr-1" />
            Created ({createdPetitions.length + createdPolls.length})
          </TabsTrigger>
          <TabsTrigger value="interacted" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-slate-500 hover:text-slate-700 font-medium px-4 py-3 text-sm transition-all">
            <TrendingUp className="w-4 h-4 mr-1" />
            Interacted ({signedPetitions.length + votedPolls.length + memberships.length})
          </TabsTrigger>
          <TabsTrigger value="petitions_created" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-slate-500 hover:text-slate-700 font-medium px-4 py-3 text-sm transition-all">
            <PenLine className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">Petitions</span> ({createdPetitions.length})
          </TabsTrigger>
          <TabsTrigger value="polls" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-slate-500 hover:text-slate-700 font-medium px-4 py-3 text-sm transition-all">
            <BarChart3 className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">Polls</span> ({createdPolls.length})
          </TabsTrigger>
          <TabsTrigger value="comments" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-slate-500 hover:text-slate-700 font-medium px-4 py-3 text-sm transition-all">
            <MessageSquare className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">Comments</span> ({comments.length})
          </TabsTrigger>
          <TabsTrigger value="communities" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-slate-500 hover:text-slate-700 font-medium px-4 py-3 text-sm transition-all">
            <UsersIcon className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">Communities</span> ({ownedCommunities.length + memberships.length})
          </TabsTrigger>
          <TabsTrigger value="following" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-slate-500 hover:text-slate-700 font-medium px-4 py-3 text-sm transition-all">
            <UsersIcon className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">Following</span> ({followingCount})
          </TabsTrigger>
          <TabsTrigger value="activity" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-slate-500 hover:text-slate-700 font-medium px-4 py-3 text-sm transition-all">
            <TrendingUp className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">Activity</span>
          </TabsTrigger>
        </TabsList>

        {/* Created Tab — petitions + polls combined */}
        <TabsContent value="created">
          <div className="space-y-6">
            {createdPetitions.length === 0 && createdPolls.length === 0 ? (
              <Card className="border-slate-200 p-12 text-center">
                <PenLine className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Nothing Created Yet</h3>
                <p className="text-slate-600">{isOwnProfile ? "Create a petition or poll to get started" : "This user hasn't created any public content yet"}</p>
              </Card>
            ) : (
              <>
                {createdPetitions.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Petitions ({createdPetitions.length})</h3>
                    <div className="space-y-3">
                      {createdPetitions.map(p => (
                        <Card key={p.id} className="border-slate-200 p-4 hover:border-blue-300 transition-colors cursor-pointer" onClick={() => navigate(createPageUrl("PetitionDetail") + `?id=${p.id}`)}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-slate-900 truncate">{p.title}</h4>
                              <p className="text-sm text-slate-500 mt-0.5 line-clamp-1">{p.short_summary}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="text-lg font-bold text-blue-600">{(p.signature_count_total || 0).toLocaleString()}</div>
                              <div className="text-xs text-slate-400">signatures</div>
                            </div>
                          </div>
                          <div className="flex gap-2 mt-2 flex-wrap">
                            <Badge variant="outline" className="text-xs">{(p.category || '').replace(/_/g, ' ')}</Badge>
                            <Badge className={`text-xs ${p.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{p.status}</Badge>
                            {(isOwnProfile || isAdmin) && p.creator_visible === false && (
                              <Badge className="text-xs bg-amber-50 text-amber-700">Anonymous</Badge>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
                {createdPolls.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Polls ({createdPolls.length})</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {createdPolls.map(poll => (
                        <PollCard key={poll.id} poll={poll} hasVoted={votedPollIds.has(poll.id)} onClick={() => navigate(createPageUrl("PollDetail") + `?id=${poll.id}`)} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </TabsContent>

        {/* Interacted Tab */}
        <TabsContent value="interacted">
          <div className="space-y-6">
            {signedPetitions.length === 0 && votedPolls.length === 0 && memberships.length === 0 ? (
              <Card className="border-slate-200 p-12 text-center">
                <TrendingUp className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No Activity Yet</h3>
                <p className="text-slate-600">{isOwnProfile ? "Sign petitions and vote on polls to see activity here" : "No public activity to display"}</p>
              </Card>
            ) : (
              <>
                {signedPetitions.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Signed Petitions ({signedPetitions.length})</h3>
                    <div className="space-y-3">
                      {signedPetitions.map(p => (
                        <Card key={p.id} className="border-slate-200 p-4 hover:border-blue-300 cursor-pointer transition-colors" onClick={() => navigate(createPageUrl("PetitionDetail") + `?id=${p.id}`)}>
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <h4 className="font-semibold text-slate-900 truncate">{p.title}</h4>
                              <p className="text-xs text-slate-400 mt-0.5">{(p.signature_count_total || 0).toLocaleString()} signatures · {(p.category || '').replace(/_/g,' ')}</p>
                            </div>
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
                {votedPolls.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2"><Globe2 className="w-4 h-4 text-blue-500" /> Voted Polls ({votedPolls.length})</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {votedPolls.map(poll => (
                        <PollCard key={poll.id} poll={poll} hasVoted={true} onClick={() => navigate(createPageUrl("PollDetail") + `?id=${poll.id}`)} />
                      ))}
                    </div>
                  </div>
                )}
                {memberships.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2"><UsersIcon className="w-4 h-4 text-purple-500" /> Joined Communities ({memberships.length})</h3>
                    <p className="text-sm text-slate-500">{memberships.length} community memberships</p>
                  </div>
                )}
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="polls">
          {createdPolls.length === 0 ? (
            <Card className="border-slate-200 p-12 text-center">
              <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                No Polls Created Yet
              </h3>
              <p className="text-slate-600 mb-4">
                {isOwnProfile ? "Create your first poll" : "This user hasn't created any public polls yet"}
              </p>
              {isOwnProfile && (
                <Button onClick={() => navigate(createPageUrl("CreatePoll"))}>
                  Create a Poll
                </Button>
              )}
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {createdPolls.map((poll) => (
                <div key={poll.id} className="relative group">
                  <PollCard
                    poll={poll}
                    hasVoted={votedPollIds.has(poll.id)}
                    onClick={() => navigate(createPageUrl("PollDetail") + `?id=${poll.id}`)}
                  />
                  {isOwnProfile && (
                    <button
                      onClick={(e) => handleDeletePoll(e, poll.id)}
                      className="absolute top-2 right-2 p-1.5 bg-white border border-red-200 rounded-lg text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                      title="Delete poll"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="votes">
          {votedPolls.length === 0 ? (
            <Card className="border-slate-200 p-12 text-center">
              <Globe2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                No Votes Cast Yet
              </h3>
              <p className="text-slate-600 mb-4">
                {isOwnProfile ? "Start voting on polls" : "This user hasn't voted yet"}
              </p>
              {isOwnProfile && (
                <Button onClick={() => navigate(createPageUrl("Home"))}>
                  Browse Polls
                </Button>
              )}
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {votedPolls.map((poll) => (
                <PollCard
                  key={poll.id}
                  poll={poll}
                  hasVoted={true}
                  onClick={() =>
                    navigate(createPageUrl("PollDetail") + `?id=${poll.id}`)
                  }
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="petitions_created">
          {createdPetitions.length === 0 ? (
            <Card className="border-slate-200 p-12 text-center">
              <PenLine className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No Petitions Created</h3>
              <p className="text-slate-600 mb-4">{isOwnProfile ? "Start your first petition" : "This user hasn't created any petitions yet"}</p>
              {isOwnProfile && <Button onClick={() => navigate(createPageUrl("CreatePetition"))}><PenLine className="w-4 h-4 mr-2" />Start a Petition</Button>}
            </Card>
          ) : (
            <div className="space-y-3">
              {createdPetitions.map(p => (
                <Card key={p.id} className="border-slate-200 p-4 hover:border-blue-300 transition-colors cursor-pointer relative group" onClick={() => navigate(createPageUrl("PetitionDetail") + `?id=${p.id}`)}>
                  {isOwnProfile && (
                    <button
                      onClick={(e) => handleDeletePetition(e, p.id)}
                      className="absolute top-3 right-3 p-1.5 bg-white border border-red-200 rounded-lg text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                      title="Delete petition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-slate-900 truncate">{p.title}</h4>
                      <p className="text-sm text-slate-500 mt-0.5 line-clamp-1">{p.short_summary}</p>
                    </div>
                    <div className="text-right flex-shrink-0 mr-8">
                      <div className="text-lg font-bold text-blue-600">{(p.signature_count_total || 0).toLocaleString()}</div>
                      <div className="text-xs text-slate-400">signatures</div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="outline" className="text-xs">{(p.category || '').replace(/_/g, ' ')}</Badge>
                    <Badge className={`text-xs ${p.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{p.status}</Badge>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="petitions_signed">
          {signedPetitions.length === 0 ? (
            <Card className="border-slate-200 p-12 text-center">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No Petitions Signed</h3>
              <p className="text-slate-600 mb-4">{isOwnProfile ? "Browse and sign petitions you care about" : "No public petitions signed"}</p>
              {isOwnProfile && <Button onClick={() => navigate(createPageUrl("Petitions"))}>Browse Petitions</Button>}
            </Card>
          ) : (
            <div className="space-y-3">
              {signedPetitions.map(p => (
                <Card key={p.id} className="border-slate-200 p-4 hover:border-blue-300 transition-colors cursor-pointer" onClick={() => navigate(createPageUrl("PetitionDetail") + `?id=${p.id}`)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-slate-900 truncate">{p.title}</h4>
                      <p className="text-sm text-slate-500 mt-0.5 line-clamp-1">{p.short_summary}</p>
                    </div>
                    <div className="text-right flex-shrink-0 flex items-center gap-1 text-emerald-600">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="text-xs font-medium">Signed</span>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="outline" className="text-xs">{(p.category || '').replace(/_/g, ' ')}</Badge>
                    <span className="text-xs text-slate-400">{(p.signature_count_total || 0).toLocaleString()} signatures</span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="comments">
          {comments.length === 0 ? (
            <Card className="border-slate-200 p-12 text-center">
              <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                No Comments Yet
              </h3>
              <p className="text-slate-600">
                {isOwnProfile ? "Join discussions on polls" : "This user hasn't commented yet"}
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {comments.slice(0, 20).map((comment) => (
                <Card key={comment.id} className="border-slate-200 p-4">
                  <div className="flex items-center gap-2 mb-2 text-sm text-slate-500">
                    <MessageSquare className="w-3 h-3" />
                    <span>
                      On poll: {comment.poll_id.substring(0, 8)}...
                    </span>
                    <span>•</span>
                    <span>
                      {format(new Date(comment.created_date), "MMM d, yyyy")}
                    </span>
                  </div>
                  <p className="text-slate-700">{comment.body_text}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-emerald-600" />
                      {comment.likes_count || 0} likes
                    </span>
                    <span>{comment.dislikes_count || 0} dislikes</span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="following">
          <FollowingList userId={targetUserId} currentUser={currentUser} />
        </TabsContent>

        <TabsContent value="activity">
          <ActivityFeed userId={targetUserId} limit={30} />
        </TabsContent>

        <TabsContent value="communities">
          <div className="space-y-6">
            {ownedCommunities.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-500" />
                  Hosting ({ownedCommunities.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {ownedCommunities.map((community) => (
                    <Card
                      key={community.id}
                      className="border-slate-200 p-4 hover:border-blue-300 transition-colors cursor-pointer"
                      onClick={() =>
                        navigate(createPageUrl("CommunityDetail") + `?id=${community.id}`)
                      }
                    >
                      <h4 className="font-semibold text-slate-900 mb-1">
                        {communityName(community)}
                      </h4>
                      <p className="text-sm text-slate-600 mb-2 line-clamp-2">
                        {communityDescriptionPublic(community)}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <UsersIcon className="w-3 h-3" />
                        <span>{community.member_count_cached || 0} members</span>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {memberships.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <UsersIcon className="w-5 h-5 text-blue-500" />
                  Member of ({memberships.length})
                </h3>
                <div className="text-slate-600">
                  Viewing communities this user is a member of...
                </div>
              </div>
            )}

            {ownedCommunities.length === 0 && memberships.length === 0 && (
              <Card className="border-slate-200 p-12 text-center">
                <UsersIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  No Communities Yet
                </h3>
                <p className="text-slate-600">
                  {isOwnProfile ? "Create or join a community" : "This user isn't part of any communities"}
                </p>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}