import { useState, useEffect } from "react";
import { api } from '@/api/client';
import { useQuery, useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Heart,
  MapPin,
  ExternalLink,
  CheckCircle2,
  Clock,
  TrendingUp,
  ArrowLeft,
  Shield,
  Globe2,
  FileText,
  MessageSquare,
  ThumbsUp,
  Calendar,
  Target,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

export default function CharityProfile() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const charityId = urlParams.get("id");

  const [user, setUser] = useState(null);
  const [newComment, setNewComment] = useState("");

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await api.auth.me();
      setUser(currentUser);
    } catch {
      setUser(null);
    }
  };

  const { data: charity, isLoading } = useQuery({
    queryKey: ["charity", charityId],
    queryFn: async () => {
      const charities = await api.entities.Charity.filter({ id: charityId });
      return charities[0];
    },
    enabled: !!charityId,
  });

  const addCommentMutation = useMutation({
    mutationFn: async (comment) => {
      await api.entities.Comment.create({
        poll_id: charityId,
        author_user_id: user.id,
        body_text: comment,
      });
    },
    onSuccess: () => {
      setNewComment("");
      toast.success("Comment added");
    },
  });

  if (!charityId || (!isLoading && !charity)) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <Heart className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-600">Charity not found</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12">
        <Skeleton className="h-48 w-full mb-6" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const yearsActive = charity.created_date ? 
    new Date().getFullYear() - new Date(charity.created_date).getFullYear() : 0;

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <Button
        variant="ghost"
        onClick={() => navigate(createPageUrl("Charities"))}
        className="mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Charities Board
      </Button>

      {/* Hero Section */}
      <div className="relative mb-8">
        {charity.cover_image_url ? (
          <div
            className="h-80 rounded-2xl bg-gradient-to-br from-pink-100 to-red-100"
            style={{
              backgroundImage: `url(${charity.cover_image_url})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
        ) : (
          <div className="h-80 rounded-2xl bg-gradient-to-br from-pink-100 to-red-100 flex items-center justify-center">
            <Heart className="w-32 h-32 text-pink-300" />
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Core Profile */}
          <Card className="border-slate-200">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4 mb-4">
                {charity.logo_url && (
                  <img
                    src={charity.logo_url}
                    alt={charity.name}
                    className="w-20 h-20 rounded-xl object-cover border-2 border-slate-200"
                  />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl font-bold text-slate-900">{charity.name}</h1>
                    {charity.verification_level === "platform_verified" && (
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        Platform Verified
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 mb-3">
                    <Badge variant="outline">
                      <MapPin className="w-3 h-3 mr-1" />
                      {charity.country}
                      {charity.region && ` • ${charity.region}`}
                    </Badge>
                    <Badge variant="outline">
                      <Clock className="w-3 h-3 mr-1" />
                      {yearsActive} {yearsActive === 1 ? "year" : "years"} active
                    </Badge>
                  </div>

                  {charity.categories?.map((cat) => (
                    <Badge key={cat} className="mr-2 mb-2">
                      {cat.replace("_", " ")}
                    </Badge>
                  ))}
                </div>
              </div>

              {charity.website_url && (
                <a
                  href={charity.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline flex items-center gap-1 text-sm mb-4"
                >
                  <ExternalLink className="w-4 h-4" />
                  {charity.website_url}
                </a>
              )}
            </CardContent>
          </Card>

          {/* Mission & Purpose */}
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle>Mission & Purpose</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                {charity.description}
              </p>
            </CardContent>
          </Card>

          {/* Progress & Impact Timeline */}
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                Progress & Impact Reporting
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Alert className="border-blue-200 bg-blue-50 mb-4">
                <FileText className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-900 text-sm">
                  All updates are timestamped and permanent. Charities must post regular progress updates with evidence.
                </AlertDescription>
              </Alert>

              <div className="text-center py-8 text-slate-600">
                <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <p>No progress updates yet</p>
                <p className="text-sm">Check back soon for impact reports and milestones</p>
              </div>
            </CardContent>
          </Card>

          {/* Community Validation */}
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Community Engagement
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <ThumbsUp className="w-4 h-4 mr-2" />
                  Verified Impact
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Transparent Reporting
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  <Target className="w-4 h-4 mr-2" />
                  Clear Outcomes
                </Button>
              </div>

              <Separator />

              {user && (
                <div className="space-y-2">
                  <Textarea
                    placeholder="Ask a question or share your thoughts..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={3}
                  />
                  <Button
                    onClick={() => addCommentMutation.mutate(newComment)}
                    disabled={!newComment.trim() || addCommentMutation.isPending}
                  >
                    Post Comment
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Impact Stats */}
          <Card className="border-2 border-slate-200 bg-slate-50">
            <CardHeader>
              <CardTitle className="text-lg">Impact Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center p-4 bg-white rounded-lg">
                <div className="text-3xl font-bold text-green-600 mb-1">
                  ${(charity.total_donations_amount || 0).toLocaleString()}
                </div>
                <div className="text-sm text-slate-600">Total Support Raised</div>
              </div>

              <div className="text-center p-4 bg-white rounded-lg">
                <div className="text-2xl font-bold text-blue-600 mb-1">
                  {charity.donations_count || 0}
                </div>
                <div className="text-sm text-slate-600">Supporters</div>
              </div>
            </CardContent>
          </Card>

          {/* Verification Details */}
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Verification Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <span className="text-slate-600">Status:</span>{" "}
                <Badge className="bg-emerald-50 text-emerald-700">
                  {charity.verification_level?.replace("_", " ") || "Verified"}
                </Badge>
              </div>
              {charity.slug && (
                <div>
                  <span className="text-slate-600">Profile ID:</span>{" "}
                  <code className="text-xs bg-slate-100 px-2 py-1 rounded">{charity.slug}</code>
                </div>
              )}
            </CardContent>
          </Card>

          {/* External Links */}
          {charity.website_url && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => window.open(charity.website_url, "_blank")}
            >
              <Globe2 className="w-4 h-4 mr-2" />
              Visit Website
            </Button>
          )}

          {/* Transparency Notice */}
          <Alert className="border-slate-200">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs text-slate-600">
              <strong>Platform Neutrality:</strong> Every Voice does not endorse specific charities. 
              Verification confirms legitimacy only. Research before donating.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  );
}