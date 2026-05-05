import React, { useState, Suspense } from "react";
import { api } from '@/api/client';
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Globe2,
  MapPin,
  Clock,
  Users,
  CheckCircle2,
  AlertTriangle,
  Share2,
  Flag,
  BarChart3,
  User,
  Calendar,
  MessageSquare,
  Lightbulb,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonDetail } from "@/components/ui/SkeletonCard";
import VotingInterface from "../components/polls/VotingInterface";
import VerificationBadge from "../components/profile/VerificationBadge";
const ResultsVisualization = React.lazy(() => import("../components/polls/ResultsVisualization"));
const ReportModal = React.lazy(() => import("../components/moderation/ReportModal"));
const CommentThread = React.lazy(() => import("../components/comments/CommentThread"));
const OptionSuggestions = React.lazy(() => import("../components/polls/OptionSuggestions"));
const DonationSection = React.lazy(() => import("../components/charity/DonationSection"));
const VoteTrustIndicators = React.lazy(() => import("../components/polls/VoteTrustIndicators"));
const SocialShareButtons = React.lazy(() => import("../components/social/SocialShareButtons"));

const CATEGORY_LABELS = {
  politics_society: "Politics & Society",
  environment: "Environment",
  economy_work: "Economy & Work",
  technology_innovation: "Technology & Innovation",
  health: "Health",
  lifestyle_culture: "Lifestyle & Culture",
  sports: "Sports",
  other: "Other",
};

export default function PollDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  function safeId(raw) {
    if (!raw) return null;
    const clean = String(raw).replace(/[^a-zA-Z0-9\-_]/g, "");
    return clean.length > 0 && clean.length < 128 ? clean : null;
  }
  const pollId = safeId(urlParams.get("id"));

  const { user } = useAuth();
  const [showReportModal, setShowReportModal] = useState(false);
  const [translated, setTranslated] = useState("");

  const { data: poll, isLoading: pollLoading, error: pollError } = useQuery({
    queryKey: ["poll", pollId],
    queryFn: async () => {
      const polls = await api.entities.Poll.filter({ id: pollId });
      if (polls.length === 0) throw new Error("Poll not found");
      return polls[0];
    },
    enabled: !!pollId,
    retry: 1,
    staleTime: 60_000,
  });

  const { data: options = [] } = useQuery({
    queryKey: ["pollOptions", pollId],
    queryFn: () =>
      api.entities.PollOption.filter({ poll_id: pollId }, "order_index"),
    enabled: !!pollId,
    staleTime: 30_000,
  });

  const { data: creator } = useQuery({
    queryKey: ["user", poll?.creator_user_id],
    queryFn: async () => {
      const users = await api.entities.User.filter({
        id: poll.creator_user_id,
      });
      return users[0];
    },
    enabled: !!poll?.creator_user_id && !poll?.is_anonymous_display,
    staleTime: 5 * 60_000,
  });

  const { data: myVote } = useQuery({
    queryKey: ["myVote", pollId, user?.id],
    queryFn: async () => {
      if (!user) return null;
      const votes = await api.entities.Vote.filter({
        poll_id: pollId,
        user_id: user.id,
      });
      return votes.length > 0 ? votes[0] : null;
    },
    enabled: !!pollId && !!user,
    staleTime: 5 * 60_000,
  });

  const { data: allVotes = [] } = useQuery({
    queryKey: ["votes", pollId],
    queryFn: () => api.entities.Vote.filter({ poll_id: pollId }),
    enabled: !!pollId && (
      !!myVote ||
      poll?.status === "closed" ||
      poll?.result_visibility === "always_visible"
    ),
    staleTime: 30_000,
  });

  const voteMutation = useMutation({
    mutationFn: async (optionId) => {
      const voteData = {
        poll_id: pollId,
        user_id: user.id,
        option_id: optionId,
        is_verified_user: user.is_verified || false,
        user_country_code_snapshot: user.country_code,
        user_age_bracket_snapshot: user.age_bracket,
      };

      if (myVote) {
        await api.entities.Vote.update(myVote.id, voteData);
      } else {
        await api.entities.Vote.create(voteData);
        await api.entities.Poll.update(pollId, {
          total_votes_cached: (poll.total_votes_cached || 0) + 1,
          verified_votes_count: (poll.verified_votes_count || 0) + (user.is_verified ? 1 : 0),
          first_vote_cast_at: poll.first_vote_cast_at || new Date().toISOString(),
        });
        await api.auth.updateMe({ polls_voted_count: (user.polls_voted_count || 0) + 1 });
      }

      const option = options.find((o) => o.id === optionId);
      if (option) {
        await api.entities.PollOption.update(optionId, {
          votes_count_cached: (option.votes_count_cached || 0) + (myVote ? 0 : 1),
          verified_votes_count: (option.verified_votes_count || 0) + (myVote ? 0 : user.is_verified ? 1 : 0),
        });
      }

      if (myVote && myVote.option_id !== optionId) {
        const oldOption = options.find((o) => o.id === myVote.option_id);
        if (oldOption) {
          await api.entities.PollOption.update(myVote.option_id, {
            votes_count_cached: Math.max(0, (oldOption.votes_count_cached || 1) - 1),
            verified_votes_count: Math.max(0, (oldOption.verified_votes_count || 0) - (myVote.is_verified_user ? 1 : 0)),
          });
        }
      }
    },
    onMutate: async (optionId) => {
      // Optimistic update: immediately show the user's vote
      await queryClient.cancelQueries({ queryKey: ["myVote", pollId, user?.id] });
      await queryClient.cancelQueries({ queryKey: ["poll", pollId] });
      const previousMyVote = queryClient.getQueryData(["myVote", pollId, user?.id]);
      const previousPoll = queryClient.getQueryData(["poll", pollId]);

      // Optimistically set myVote
      queryClient.setQueryData(["myVote", pollId, user?.id], {
        poll_id: pollId, user_id: user.id, option_id: optionId, id: previousMyVote?.id || "optimistic",
      });
      // Optimistically increment vote count
      if (!previousMyVote && previousPoll) {
        queryClient.setQueryData(["poll", pollId], {
          ...previousPoll,
          total_votes_cached: (previousPoll.total_votes_cached || 0) + 1,
        });
      }
      return { previousMyVote, previousPoll };
    },
    onError: (_err, _optionId, context) => {
      if (context?.previousMyVote !== undefined) queryClient.setQueryData(["myVote", pollId, user?.id], context.previousMyVote);
      if (context?.previousPoll) queryClient.setQueryData(["poll", pollId], context.previousPoll);
      toast.error("Failed to record vote. Please try again.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["poll", pollId] });
      queryClient.invalidateQueries({ queryKey: ["pollOptions", pollId] });
      queryClient.invalidateQueries({ queryKey: ["myVote", pollId] });
      queryClient.invalidateQueries({ queryKey: ["votes", pollId] });
      toast.success("Vote recorded successfully!");
    },
  });

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: poll?.question || "Poll", url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard!");
      }
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard!");
      } catch { toast.error("Could not copy link"); }
    }
  };

  if (!pollId) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <AlertTriangle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Poll Not Found</h2>
        <p className="text-slate-600 mb-6">
          The poll you're looking for doesn't exist or has been removed.
        </p>
        <Button onClick={() => navigate(createPageUrl("Home"))}>
          Back to Home
        </Button>
      </div>
    );
  }

  if (pollLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <SkeletonDetail />
      </div>
    );
  }

  if (pollError || !poll) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <AlertTriangle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Poll Not Found</h2>
        <p className="text-slate-600 mb-6">
          The poll you're looking for doesn't exist or has been removed.
        </p>
        <Button onClick={() => navigate(createPageUrl("Home"))}>
          Back to Home
        </Button>
      </div>
    );
  }

  const isPollOpen = poll.status === "open" && (!poll.end_time || new Date(poll.end_time) > new Date());
  const canVote = user && isPollOpen;
  const canSeeResults =
    myVote ||
    poll.status === "closed" ||
    poll.result_visibility === "always_visible";

  const timeRemaining = poll.end_time
    ? formatDistanceToNow(new Date(poll.end_time), { addSuffix: true })
    : "No end date";

  const isCreator = user && user.id === poll.creator_user_id;

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-12">
      {/* Poll Header */}
      <Card className="border-slate-200 shadow-sm mb-6">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-slate-100 text-slate-700 border-slate-200">
              {CATEGORY_LABELS[poll.category] || "Other"}
            </Badge>
            {poll.audience_type === "global" ? (
              <Badge variant="outline" className="border-blue-200 text-blue-700">
                <Globe2 className="w-3 h-3 mr-1" />
                Global
              </Badge>
            ) : (
              <Badge variant="outline" className="border-slate-200 text-slate-700">
                <MapPin className="w-3 h-3 mr-1" />
                {poll.audience_country_code}
              </Badge>
            )}
            {poll.nsfw_flag && (
              <Badge variant="outline" className="border-orange-200 text-orange-700">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Sensitive Content
              </Badge>
            )}
            {poll.status === "closed" && (
              <Badge className="bg-red-50 text-red-700 border-red-200">
                Closed
              </Badge>
            )}
            {poll.status === "archived" && (
              <Badge className="bg-slate-50 text-slate-700 border-slate-200">
                Archived
              </Badge>
            )}
          </div>

          <h1 className="text-3xl font-bold text-slate-900 leading-tight">
            {poll.question}
          </h1>

          {poll.image_url && (
            <img src={poll.image_url} alt={poll.question} className="w-full max-h-64 object-cover rounded-lg" />
          )}

          {poll.description && (
            <p className="text-slate-600 leading-relaxed">{poll.description}</p>
          )}

          {poll.tags && poll.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {poll.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="text-sm px-3 py-1 bg-slate-100 text-slate-600 rounded-full"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          <Separator />

          <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
            <div className="flex items-center gap-4">
              {poll.is_anonymous_display ? (
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-600">
                    by <strong>Anonymous</strong>
                  </span>
                </div>
              ) : (
                creator && (
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-600">
                      by <strong>{creator.display_name}</strong>
                    </span>
                    {creator.country_code && (
                      <span className="text-slate-500">({creator.country_code})</span>
                    )}
                    <VerificationBadge user={creator} size="sm" />
                  </div>
                )
              )}
              <div className="flex items-center gap-2 text-slate-600">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>{format(new Date(poll.created_date), "MMM d, yyyy")}</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-slate-600">
                <Users className="w-4 h-4" />
                <span className="font-semibold">{poll.total_votes_cached || 0}</span>
                <span>votes</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <MessageSquare className="w-4 h-4" />
                <span className="font-semibold">{poll.comments_count || 0}</span>
                <span>comments</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Clock className="w-4 h-4" />
                <span>{isPollOpen ? `Ends ${timeRemaining}` : "Closed"}</span>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Voting / Results */}
      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          {canVote && !myVote ? (
            <VotingInterface
              options={options}
              onVote={(optionId) => voteMutation.mutate(optionId)}
              isLoading={voteMutation.isPending}
              user={user}
              poll={poll}
            />
          ) : canSeeResults ? (
            <Suspense fallback={<Skeleton className="h-64 rounded-xl" />}>
              <ResultsVisualization
                poll={poll}
                options={options}
                votes={allVotes}
                myVote={myVote}
                canChangeVote={canVote && myVote}
                onChangeVote={(optionId) => voteMutation.mutate(optionId)}
              />
            </Suspense>
          ) : (
            <Card className="border-slate-200 p-8 text-center">
              <Clock className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Results Hidden
              </h3>
              <p className="text-slate-600">
                Results will be visible after the poll closes
              </p>
            </Card>
          )}
        </div>

        {/* Sidebar */}
         <div className="space-y-4">
           <Card className="border-slate-200 p-4">
             <Suspense fallback={<Skeleton className="h-12 rounded-xl" />}>
               <SocialShareButtons
                 title={poll.question}
                 url={window.location.href}
               />
               <Button
                 variant="outline"
                 className="w-full mt-2"
                 onClick={async () => {
                   const { data: { session } } = await supabase.auth.getSession();
                   if (!session) return;
                   const { data } = await supabase.functions.invoke("translate-content", {
                     body: {
                       content: `${poll.question}\n\n${poll.description || ""}`,
                       targetLanguage: navigator.language || "en",
                     },
                   });
                   setTranslated(data?.translated || "");
                 }}
               >
                 Translate
               </Button>
             </Suspense>
           </Card>

           <Card className="border-slate-200 p-4">
             <div className="space-y-2">
               {(poll.location_country_code || poll.audience_country_code) && (
                 <Button
                   variant="outline"
                   className="w-full justify-start"
                   onClick={() => navigate(createPageUrl("WorldView"))}
                 >
                   <Globe2 className="w-4 h-4 mr-2" />
                   View on World Map
                 </Button>
               )}
               {user && (
                 <Button
                   variant="outline"
                   className="w-full justify-start text-orange-600 hover:text-orange-700"
                   onClick={() => setShowReportModal(true)}
                 >
                   <Flag className="w-4 h-4 mr-2" />
                   Report Poll
                 </Button>
               )}
             </div>
           </Card>

          {canSeeResults && (
            <Suspense fallback={<Skeleton className="h-24 rounded-xl" />}>
              <VoteTrustIndicators poll={poll} votes={allVotes} />
            </Suspense>
          )}
        </div>
      </div>

      {/* Option Suggestions */}
      {isPollOpen && poll.allow_option_suggestions && options.length < 20 && (
        <div className="mb-6">
          <Suspense fallback={<Skeleton className="h-24 rounded-xl" />}>
            <OptionSuggestions pollId={pollId} isCreator={isCreator} user={user} />
          </Suspense>
        </div>
      )}

      {/* Donations */}
      <div className="mb-6">
        <Suspense fallback={<Skeleton className="h-20 rounded-xl" />}>
          <DonationSection pollId={pollId} user={user} />
        </Suspense>
      </div>

      {/* Comments */}
      {poll.allow_comments !== false && (
        <Suspense fallback={<div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>}>
          <CommentThread pollId={pollId} user={user} requireFullVerification={poll.verified_only || false} />
        </Suspense>
      )}
      {translated && (
        <Card className="border-slate-200 mt-4">
          <CardHeader><CardTitle className="text-base">Translated</CardTitle></CardHeader>
          <CardContent><p className="text-sm whitespace-pre-wrap">{translated}</p></CardContent>
        </Card>
      )}

      {showReportModal && (
        <Suspense fallback={null}>
          <ReportModal targetType="poll" targetId={pollId} onClose={() => setShowReportModal(false)} />
        </Suspense>
      )}
    </div>
  );
}