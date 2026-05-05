import { api } from '@/api/client';
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Scale,
  TrendingDown,
  TrendingUp,
  Calendar,
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
  Shield,
  Star,
} from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FigureRatingPanel from "../components/impact/FigureRatingPanel";

export default function FigureProfile() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const rawFigureId = urlParams.get("id");
  const figureId = rawFigureId ? String(rawFigureId).replace(/[^a-zA-Z0-9\-_]/g, "").slice(0, 128) || null : null;

  const { user } = useAuth();

  const { data: figure, isLoading: figureLoading } = useQuery({
    queryKey: ["publicFigure", figureId],
    queryFn: async () => {
      const figures = await api.entities.PublicFigure.filter({ id: figureId });
      if (figures.length === 0) throw new Error("Figure not found");
      return figures[0];
    },
    enabled: !!figureId,
    staleTime: 5 * 60_000,
  });

  const { data: events = [] } = useQuery({
    queryKey: ["figureEvents", figureId],
    queryFn: () =>
      api.entities.ImpactEvent.filter({ figure_id: figureId }, "-date_of_event"),
    enabled: !!figureId,
    staleTime: 5 * 60_000,
  });

  const { data: _ratings = [] } = useQuery({
    queryKey: ["figureRatings", figureId],
    queryFn: () => api.entities.FigureRating.filter({ figure_id: figureId }),
    enabled: !!figureId,
    staleTime: 2 * 60_000,
  });

  const { data: myVotes = [] } = useQuery({
    queryKey: ["myEventVotes", user?.id],
    queryFn: () => api.entities.EventVote.filter({ user_id: user.id }),
    enabled: !!user,
  });

  const voteMutation = useMutation({
    mutationFn: async ({ eventId, voteType }) => {
      const existingVote = myVotes.find(v => v.event_id === eventId);
      
      if (existingVote) {
        if (existingVote.vote_type === voteType) {
          // Remove vote
          await api.entities.EventVote.delete(existingVote.id);
        } else {
          // Switch vote
          await api.entities.EventVote.update(existingVote.id, { vote_type: voteType });
        }
      } else {
        // New vote
        await api.entities.EventVote.create({
          event_id: eventId,
          user_id: user.id,
          vote_type: voteType,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["myEventVotes"]);
      queryClient.invalidateQueries(["figureEvents"]);
    },
  });

  if (!figureId || figureLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12">
        <Skeleton className="h-32 w-full mb-6" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!figure) return null;

  const approvedEvents = events.filter(e => e.moderation_status === 'approved');
  const negativeEvents = approvedEvents.filter(e => e.impact_type === 'negative');
  const positiveEvents = approvedEvents.filter(e => e.impact_type === 'positive');

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Button
        variant="ghost"
        onClick={() => navigate(createPageUrl("PublicFigures"))}
        className="mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Records
      </Button>

      {/* Profile Header */}
      <Card className="border-slate-200 mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-6">
            <Avatar className="h-24 w-24 bg-gradient-to-br from-slate-400 to-slate-500">
              <AvatarFallback className="bg-transparent text-white text-2xl font-bold">
                {figure.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-3xl font-bold text-slate-900">{figure.name}</h1>
                {figure.is_verified && (
                  <Badge className="bg-blue-50 text-blue-700 border-blue-200">
                    <Shield className="w-3 h-3 mr-1" />
                    Verified
                  </Badge>
                )}
              </div>
              <p className="text-slate-600 mb-3">{figure.role} • {figure.country}</p>
              {figure.public_bio && (
                <p className="text-slate-700 leading-relaxed mb-4">{figure.public_bio}</p>
              )}
              {figure.tags && figure.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {figure.tags.map((tag, idx) => (
                    <Badge key={idx} variant="outline">{tag}</Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 min-w-[200px]">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="text-sm text-red-700 mb-1">Harmful Events</div>
                <div className="text-3xl font-bold text-red-600">{negativeEvents.length}</div>
              </div>
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                <div className="text-sm text-emerald-700 mb-1">Positive Events</div>
                <div className="text-3xl font-bold text-emerald-600">{positiveEvents.length}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ratings Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Trustworthiness</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500" />
              <span className="text-2xl font-bold">
                {figure.trustworthiness_rating > 0 ? figure.trustworthiness_rating.toFixed(1) : 'N/A'}
              </span>
              <span className="text-slate-500">/ 5</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Ethical Conduct</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500" />
              <span className="text-2xl font-bold">
                {figure.ethical_conduct_rating > 0 ? figure.ethical_conduct_rating.toFixed(1) : 'N/A'}
              </span>
              <span className="text-slate-500">/ 5</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Transparency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500" />
              <span className="text-2xl font-bold">
                {figure.transparency_rating > 0 ? figure.transparency_rating.toFixed(1) : 'N/A'}
              </span>
              <span className="text-slate-500">/ 5</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Rating Panel */}
      {user && user.is_verified && (
        <FigureRatingPanel figure={figure} user={user} />
      )}

      {/* Events Timeline */}
      <Tabs defaultValue="all" className="mt-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">All Events ({approvedEvents.length})</TabsTrigger>
          <TabsTrigger value="negative">
            <TrendingDown className="w-4 h-4 mr-2" />
            Harmful ({negativeEvents.length})
          </TabsTrigger>
          <TabsTrigger value="positive">
            <TrendingUp className="w-4 h-4 mr-2" />
            Positive ({positiveEvents.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <EventsList events={approvedEvents} myVotes={myVotes} onVote={voteMutation.mutate} user={user} />
        </TabsContent>
        <TabsContent value="negative" className="mt-6">
          <EventsList events={negativeEvents} myVotes={myVotes} onVote={voteMutation.mutate} user={user} />
        </TabsContent>
        <TabsContent value="positive" className="mt-6">
          <EventsList events={positiveEvents} myVotes={myVotes} onVote={voteMutation.mutate} user={user} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EventsList({ events, myVotes, onVote, user }) {
  if (events.length === 0) {
    return (
      <Card className="border-slate-200">
        <CardContent className="py-12 text-center">
          <Scale className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600">No verified events yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {events.map((event) => {
        const myVote = myVotes.find(v => v.event_id === event.id);

        return (
          <Card key={event.id} className={`border-2 ${
            event.impact_type === 'negative' 
              ? 'border-red-200 bg-red-50/30' 
              : 'border-emerald-200 bg-emerald-50/30'
          }`}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {event.impact_type === 'negative' ? (
                      <TrendingDown className="w-5 h-5 text-red-600" />
                    ) : (
                      <TrendingUp className="w-5 h-5 text-emerald-600" />
                    )}
                    <h3 className="text-lg font-bold text-slate-900">{event.title}</h3>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-600 mb-3">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(event.date_of_event), 'PPP')}
                    </span>
                    <Badge variant="outline">{event.category.replace(/_/g, ' ')}</Badge>
                    {event.severity_score && (
                      <Badge className={
                        event.severity_score >= 8 ? 'bg-red-100 text-red-700' :
                        event.severity_score >= 5 ? 'bg-amber-100 text-amber-700' :
                        'bg-blue-100 text-blue-700'
                      }>
                        Severity: {event.severity_score}/10
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-slate-700 leading-relaxed">{event.detailed_description}</p>

              <Separator />

              <div>
                <h4 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Verified Sources
                </h4>
                <div className="space-y-2">
                  {event.citations?.map((citation, idx) => (
                    <a
                      key={idx}
                      href={citation.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      <ExternalLink className="w-4 h-4" />
                      {citation.source_name || 'Source'}
                    </a>
                  ))}
                </div>
              </div>

              {user && user.is_verified && (
                <div className="flex items-center gap-3 pt-2">
                  <Button
                    variant={myVote?.vote_type === 'upvote' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onVote({ eventId: event.id, voteType: 'upvote' })}
                    className="flex items-center gap-2"
                  >
                    <ThumbsUp className="w-4 h-4" />
                    {event.upvotes_count || 0}
                  </Button>
                  <Button
                    variant={myVote?.vote_type === 'downvote' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onVote({ eventId: event.id, voteType: 'downvote' })}
                    className="flex items-center gap-2"
                  >
                    <ThumbsDown className="w-4 h-4" />
                    {event.downvotes_count || 0}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}