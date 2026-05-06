import { useState, useEffect } from "react";
import { api } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Flame, TrendingUp, Globe, Users, MessageSquare, CheckCircle2,
  FileText, Share2, Download, RefreshCw, ArrowLeft,
  BarChart3, AlertTriangle, Sparkles, Copy
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

function ScoreBadge({ score }) {
  const color = score >= 70 ? "bg-red-100 text-red-800 border-red-300" : score >= 40 ? "bg-amber-100 text-amber-800 border-amber-300" : "bg-slate-100 text-slate-600";
  return <Badge className={color}>{Math.round(score)} media score</Badge>;
}

export default function MediaAmplification() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [selected, setSelected] = useState(null);
  const [editingPR, setEditingPR] = useState("");
  const [editingCaption, setEditingCaption] = useState("");
  const [editingHeadline, setEditingHeadline] = useState("");
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    api.auth.me().then(u => {
      if (u.role !== "admin") navigate(createPageUrl("Home"));
      else setUser(u);
    }).catch(() => navigate(createPageUrl("Home")));
  }, []);

  const { data: mediaScores = [], isLoading } = useQuery({
    queryKey: ["allMediaScores"],
    queryFn: () => api.entities.PetitionMediaScore.list("-media_score", 100),
    enabled: !!user,
  });

  const { data: petitions = [] } = useQuery({
    queryKey: ["petitionsForMedia"],
    queryFn: () => api.entities.Petition.filter({ status: "active" }),
    enabled: !!user,
  });

  const petitionMap = Object.fromEntries(petitions.map(p => [p.id, p]));

  // Calculate and upsert media scores for all active petitions
  const calcMutation = useMutation({
    mutationFn: async () => {
      const comments = await api.entities.Comment.list("-created_date", 500);
      const signatures = await api.entities.PetitionSignature.list("-created_date", 2000);

      for (const petition of petitions) {
        const petSigs = signatures.filter(s => s.petition_id === petition.id);
        const petComments = comments.filter(c => c.poll_id === petition.id);

        const now = new Date();
        const sigs24h = petSigs.filter(s => (now - new Date(s.created_date)) < 86400000).length;
        const sigs7d = petSigs.filter(s => (now - new Date(s.created_date)) < 604800000).length;
        const countries = [...new Set(petSigs.map(s => s.country_code).filter(Boolean))].length;

        const velocityScore = Math.min(sigs24h / 5, 40); // up to 40 pts
        const geoScore = Math.min(countries * 3, 25); // up to 25 pts
        const engagementScore = Math.min(petComments.length * 0.5, 20); // up to 20 pts
        const sizeScore = Math.min((petition.signature_count_total / petition.signature_goal) * 15, 15); // up to 15 pts
        const mediaScore = velocityScore + geoScore + engagementScore + sizeScore;

        const isTrending = sigs24h >= 50 || mediaScore >= 40 || petition.signature_count_total >= 1000;
        const flaggedForMedia = mediaScore >= 35;

        const existing = mediaScores.find(m => m.petition_id === petition.id);
        const payload = {
          petition_id: petition.id,
          petition_title: petition.title,
          is_trending: isTrending,
          media_score: Math.round(mediaScore * 10) / 10,
          velocity_score: Math.round(velocityScore * 10) / 10,
          geo_score: Math.round(geoScore * 10) / 10,
          engagement_score: Math.round(engagementScore * 10) / 10,
          sigs_last_24h: sigs24h,
          sigs_last_7d: sigs7d,
          country_count: countries,
          comment_count: petComments.length,
          flagged_for_media: flaggedForMedia,
          last_calculated_at: new Date().toISOString(),
        };

        if (existing) {
          await api.entities.PetitionMediaScore.update(existing.id, payload);
        } else {
          await api.entities.PetitionMediaScore.create(payload);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["allMediaScores"]);
      toast.success("Media scores recalculated");
    },
    onError: () => toast.error("Recalculation failed"),
  });

  const generateMediaPackage = async (score, petition) => {
    setGenerating(true);
    try {
      const result = await api.integrations.Core.InvokeLLM({
        prompt: `You are a civic media communications specialist. Generate a professional media package for this public petition.

PETITION DETAILS:
Title: ${petition.title}
Summary: ${petition.short_summary}
Full Description: ${petition.full_description}
Target: ${petition.target_name} (${petition.target_type})
Requested Action: ${petition.requested_action}
Category: ${petition.category}
Country: ${petition.country_code}
Signatures: ${petition.signature_count_total.toLocaleString()} total, ${petition.signature_count_verified.toLocaleString()} verified
Countries Supporting: ${score.country_count}
Growth (last 24h): ${score.sigs_last_24h} signatures

Generate:
1. press_release: A 3-paragraph formal press release (250-350 words) with headline, issue summary, signature stats, and a call for response from ${petition.target_name}
2. headline_summary: A punchy one-sentence news headline (max 15 words)
3. social_caption: A social media caption (max 280 chars, compelling, include a call to action)
4. social_headline: An ultra-short headline for social media graphics (max 8 words, ALL CAPS)
5. milestone_announcement: A milestone tweet-style announcement about the signature count (max 240 chars)`,
        response_json_schema: {
          type: "object",
          properties: {
            press_release: { type: "string" },
            headline_summary: { type: "string" },
            social_caption: { type: "string" },
            social_headline: { type: "string" },
            milestone_announcement: { type: "string" },
          }
        }
      });

      await api.entities.PetitionMediaScore.update(score.id, {
        press_release_draft: result.press_release,
        headline_summary: result.headline_summary,
        social_caption: result.social_caption,
        social_headline: result.social_headline,
        milestone_announcement: result.milestone_announcement,
        media_package_status: "draft",
      });

      queryClient.invalidateQueries(["allMediaScores"]);
      toast.success("Media package generated!");
      // Refresh selected
      const updated = { ...score, ...result, press_release_draft: result.press_release, media_package_status: "draft" };
      setSelected(updated);
      setEditingPR(result.press_release);
      setEditingCaption(result.social_caption);
      setEditingHeadline(result.headline_summary);
    } catch {
      toast.error("Generation failed");
    }
    setGenerating(false);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      await api.entities.PetitionMediaScore.update(selected.id, {
        press_release_draft: editingPR,
        social_caption: editingCaption,
        headline_summary: editingHeadline,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["allMediaScores"]);
      toast.success("Saved");
    },
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      await api.entities.PetitionMediaScore.update(selected.id, {
        owner_approved: true,
        media_package_status: "approved",
        reviewed_by_admin_id: user.id,
        reviewed_at: new Date().toISOString(),
      });
      // Mark petition trending
      await api.entities.Petition.update(selected.petition_id, { risk_flags: ["trending"] });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["allMediaScores"]);
      toast.success("Media package approved and published!");
      setSelected(null);
    },
  });

  const openEditor = (score) => {
    setSelected(score);
    setEditingPR(score.press_release_draft || "");
    setEditingCaption(score.social_caption || "");
    setEditingHeadline(score.headline_summary || "");
  };

  const trending = mediaScores.filter(s => s.is_trending);
  const flagged = mediaScores.filter(s => s.flagged_for_media && !s.is_trending);
  const approved = mediaScores.filter(s => s.media_package_status === "approved");

  const copy = (text) => { navigator.clipboard.writeText(text); toast.success("Copied!"); };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl("MasterAdmin"))}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="bg-gradient-to-br from-red-500 to-orange-500 p-2.5 rounded-xl">
            <Flame className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Media Amplification</h1>
            <p className="text-slate-500 text-sm">Trending detection, press release generation & social export</p>
          </div>
        </div>
        <Button onClick={() => calcMutation.mutate()} disabled={calcMutation.isPending} variant="outline">
          <RefreshCw className={`w-4 h-4 mr-2 ${calcMutation.isPending ? "animate-spin" : ""}`} />
          {calcMutation.isPending ? "Calculating..." : "Recalculate Scores"}
        </Button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Trending", value: trending.length, icon: Flame, color: "text-red-600 bg-red-50" },
          { label: "Flagged for Media", value: flagged.length, icon: AlertTriangle, color: "text-amber-600 bg-amber-50" },
          { label: "Packages Approved", value: approved.length, icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="border-slate-200">
            <CardContent className="pt-5 pb-5 flex items-center gap-4">
              <div className={`p-3 rounded-xl ${color.split(' ')[1]}`}>
                <Icon className={`w-5 h-5 ${color.split(' ')[0]}`} />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">{value}</div>
                <div className="text-xs text-slate-500">{label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="trending">
        <TabsList className="mb-6">
          <TabsTrigger value="trending"><Flame className="w-4 h-4 mr-1.5" />Trending ({trending.length})</TabsTrigger>
          <TabsTrigger value="flagged"><AlertTriangle className="w-4 h-4 mr-1.5" />Flagged ({flagged.length})</TabsTrigger>
          <TabsTrigger value="approved"><CheckCircle2 className="w-4 h-4 mr-1.5" />Approved ({approved.length})</TabsTrigger>
          <TabsTrigger value="analytics"><BarChart3 className="w-4 h-4 mr-1.5" />All Scores</TabsTrigger>
        </TabsList>

        {["trending", "flagged", "approved", "analytics"].map(tab => {
          const list = tab === "trending" ? trending : tab === "flagged" ? flagged : tab === "approved" ? approved : mediaScores;
          return (
            <TabsContent key={tab} value={tab}>
              {isLoading ? <Skeleton className="h-40 w-full" /> : (
                <div className="space-y-3">
                  {list.length === 0 && (
                    <div className="text-center py-12 text-slate-500">
                      <TrendingUp className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      <p>No petitions in this category yet. Click "Recalculate Scores" to analyse.</p>
                    </div>
                  )}
                  {list.map(score => {
                    const petition = petitionMap[score.petition_id];
                    return (
                      <Card key={score.id} className={`border-slate-200 ${score.is_trending ? "border-red-200 bg-red-50/10" : ""}`}>
                        <CardContent className="pt-4 pb-4">
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                {score.is_trending && <Badge className="bg-red-100 text-red-800 border-red-300 text-xs"><Flame className="w-3 h-3 mr-1" />Trending</Badge>}
                                {score.flagged_for_media && <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-xs">Media Flagged</Badge>}
                                {score.media_package_status !== "not_generated" && (
                                  <Badge className={score.media_package_status === "approved" ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"}>
                                    {score.media_package_status}
                                  </Badge>
                                )}
                                <ScoreBadge score={score.media_score} />
                              </div>
                              <p className="font-semibold text-slate-900">{score.petition_title}</p>
                              <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
                                <span><Users className="w-3 h-3 inline mr-0.5" />{petition?.signature_count_total?.toLocaleString() || 0} sigs</span>
                                <span className="text-emerald-600 font-medium">+{score.sigs_last_24h} today</span>
                                <span><Globe className="w-3 h-3 inline mr-0.5" />{score.country_count} countries</span>
                                <span><MessageSquare className="w-3 h-3 inline mr-0.5" />{score.comment_count} comments</span>
                              </div>
                              {score.headline_summary && (
                                <p className="text-xs italic text-slate-600 mt-1">"{score.headline_summary}"</p>
                              )}
                            </div>
                            <div className="flex gap-2 shrink-0">
                              {petition && (
                                <Button size="sm" variant="outline" onClick={() => {
                                  openEditor(score);
                                  if (!score.press_release_draft) generateMediaPackage(score, petition);
                                }}>
                                  <Sparkles className="w-3.5 h-3.5 mr-1" />
                                  {score.press_release_draft ? "Edit Package" : "Generate"}
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Media Package Editor Dialog */}
      {selected && (
        <Dialog open onOpenChange={() => setSelected(null)}>
          <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                Media Package — {selected.petition_title}
              </DialogTitle>
            </DialogHeader>

            {generating ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                <p className="text-slate-600 font-medium">Generating media package with AI...</p>
              </div>
            ) : (
              <Tabs defaultValue="press_release">
                <TabsList className="w-full">
                  <TabsTrigger value="press_release" className="flex-1"><FileText className="w-3.5 h-3.5 mr-1" />Press Release</TabsTrigger>
                  <TabsTrigger value="social" className="flex-1"><Share2 className="w-3.5 h-3.5 mr-1" />Social Media</TabsTrigger>
                  <TabsTrigger value="stats" className="flex-1"><BarChart3 className="w-3.5 h-3.5 mr-1" />Stats</TabsTrigger>
                </TabsList>

                <TabsContent value="press_release" className="space-y-4 mt-4">
                  <div>
                    <Label>Headline</Label>
                    <Input value={editingHeadline} onChange={e => setEditingHeadline(e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label>Full Press Release</Label>
                    <Textarea value={editingPR} onChange={e => setEditingPR(e.target.value)} rows={14} className="mt-1 font-mono text-sm" />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => copy(editingPR)}><Copy className="w-3.5 h-3.5 mr-1" />Copy</Button>
                    <Button size="sm" variant="outline" onClick={() => {
                      const blob = new Blob([editingPR], { type: "text/plain" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a"); a.href = url; a.download = "press-release.txt"; a.click();
                    }}><Download className="w-3.5 h-3.5 mr-1" />Export</Button>
                  </div>
                </TabsContent>

                <TabsContent value="social" className="space-y-4 mt-4">
                  <div>
                    <Label>Social Headline (graphic)</Label>
                    <div className="mt-1 bg-gradient-to-r from-slate-800 to-slate-900 text-white text-center py-6 px-4 rounded-xl font-extrabold text-xl uppercase tracking-wide">
                      {selected.social_headline || "HEADLINE"}
                    </div>
                    <Button size="sm" variant="outline" className="mt-2" onClick={() => copy(selected.social_headline || "")}><Copy className="w-3.5 h-3.5 mr-1" />Copy</Button>
                  </div>
                  <div>
                    <Label>Social Caption</Label>
                    <Textarea value={editingCaption} onChange={e => setEditingCaption(e.target.value)} rows={4} className="mt-1" />
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-slate-400">{editingCaption.length}/280 chars</span>
                      <Button size="sm" variant="outline" onClick={() => copy(editingCaption)}><Copy className="w-3.5 h-3.5 mr-1" />Copy</Button>
                    </div>
                  </div>
                  <div>
                    <Label>Milestone Announcement</Label>
                    <div className="mt-1 bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-800">
                      {selected.milestone_announcement || "—"}
                    </div>
                    <Button size="sm" variant="outline" className="mt-2" onClick={() => copy(selected.milestone_announcement || "")}><Copy className="w-3.5 h-3.5 mr-1" />Copy</Button>
                  </div>
                </TabsContent>

                <TabsContent value="stats" className="mt-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {[
                      { label: "Media Score", value: Math.round(selected.media_score), color: "text-red-600" },
                      { label: "Velocity Score", value: Math.round(selected.velocity_score), color: "text-amber-600" },
                      { label: "Geo Score", value: Math.round(selected.geo_score), color: "text-blue-600" },
                      { label: "Engagement Score", value: Math.round(selected.engagement_score), color: "text-purple-600" },
                      { label: "Sigs Last 24h", value: selected.sigs_last_24h?.toLocaleString(), color: "text-emerald-600" },
                      { label: "Sigs Last 7d", value: selected.sigs_last_7d?.toLocaleString(), color: "text-emerald-600" },
                      { label: "Countries", value: selected.country_count, color: "text-blue-600" },
                      { label: "Comments", value: selected.comment_count, color: "text-purple-600" },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                        <div className="text-xs text-slate-500">{label}</div>
                        <div className={`text-xl font-bold ${color}`}>{value}</div>
                      </div>
                    ))}
                  </div>
                  {selected.last_calculated_at && (
                    <p className="text-xs text-slate-400 mt-4">Last calculated: {format(new Date(selected.last_calculated_at), "PPP p")}</p>
                  )}
                </TabsContent>
              </Tabs>
            )}

            {!generating && (
              <DialogFooter className="gap-2 pt-2">
                <Button variant="outline" onClick={() => generateMediaPackage(selected, petitionMap[selected.petition_id])}>
                  <Sparkles className="w-4 h-4 mr-1" />Regenerate with AI
                </Button>
                <Button variant="outline" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                  Save Edits
                </Button>
                <Button onClick={() => approveMutation.mutate()} disabled={approveMutation.isPending || !selected.press_release_draft}
                  className="bg-emerald-600 hover:bg-emerald-700">
                  <CheckCircle2 className="w-4 h-4 mr-1" />Approve & Publish
                </Button>
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}