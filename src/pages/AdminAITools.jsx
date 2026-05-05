import { useState, useEffect } from "react";
import { api } from '@/api/client';
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Zap, Brain, Shield, TrendingUp, Activity, BarChart3 } from "lucide-react";
import { TopicClassifier } from "../components/ai/TopicClassifier";
import { AutoModerationEngine } from "../components/moderation/AutoModerationEngine";
import { ReputationEngine } from "../components/reputation/ReputationEngine";
import InsightDashboard from "../components/ai/InsightDashboard";
import ForecastAdminPanel from "../components/ai/ForecastAdminPanel";
import { toast } from "sonner";

export default function AdminAITools() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await api.auth.me();
      if (currentUser.role !== "admin") {
        navigate(createPageUrl("Home"));
        return;
      }
      setUser(currentUser);
    } catch (error) {
      navigate(createPageUrl("Home"));
    }
  };

  const { data: recentPolls = [] } = useQuery({
    queryKey: ["recentPolls"],
    queryFn: () => api.entities.Poll.list("-created_date", 20),
    enabled: !!user,
  });

  const { data: flaggedContent = [] } = useQuery({
    queryKey: ["flaggedReports"],
    queryFn: () => api.entities.Report.filter({ status: "open" }),
    enabled: !!user,
  });

  const handleClassifyPolls = async () => {
    setProcessing(true);
    try {
      const unclassifiedPolls = recentPolls.filter((p) => !p.tags || p.tags.length === 0);
      
      for (const poll of unclassifiedPolls.slice(0, 5)) {
        const classification = await TopicClassifier.classifyPoll(poll.question, poll.description);
        
        await api.entities.Poll.update(poll.id, {
          tags: classification.tags,
          nsfw_flag: classification.is_nsfw,
        });
      }
      
      toast.success(`Classified ${Math.min(5, unclassifiedPolls.length)} polls`);
    } catch (error) {
      toast.error("Classification failed");
    } finally {
      setProcessing(false);
    }
  };

  const handleAutoModerate = async () => {
    setProcessing(true);
    try {
      for (const poll of recentPolls.slice(0, 10)) {
        await AutoModerationEngine.flagSuspiciousPoll(poll.id);
      }
      toast.success("Auto-moderation scan complete");
    } catch (error) {
      toast.error("Auto-moderation failed");
    } finally {
      setProcessing(false);
    }
  };

  const handleRecalculateReputation = async () => {
    setProcessing(true);
    try {
      // Recalculate for active users
      const users = await api.entities.User.list("-created_date", 20);
      
      for (const targetUser of users) {
        await ReputationEngine.updateUserReputation(targetUser.id);
      }
      
      toast.success("Reputation scores updated");
    } catch (error) {
      toast.error("Reputation update failed");
    } finally {
      setProcessing(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <Alert className="border-purple-200 bg-purple-50 mb-6">
        <Brain className="h-4 w-4 text-purple-600" />
        <AlertDescription className="text-sm text-purple-800">
          <strong>Phase 1: Foundation</strong> - AI-powered automation for trust, safety, and engagement.
        </AlertDescription>
      </Alert>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
          <Zap className="w-8 h-8 text-purple-600" />
          AI Tools & Automation
        </h1>
        <p className="text-slate-600">Advanced AI systems for platform management</p>
      </div>

      <Tabs defaultValue="insights">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="insights"><Activity className="w-4 h-4 mr-2" />AI Insights</TabsTrigger>
          <TabsTrigger value="forecast"><TrendingUp className="w-4 h-4 mr-2" />Forecast</TabsTrigger>
          <TabsTrigger value="classification"><Brain className="w-4 h-4 mr-2" />Classification</TabsTrigger>
          <TabsTrigger value="moderation"><Shield className="w-4 h-4 mr-2" />Moderation</TabsTrigger>
          <TabsTrigger value="reputation"><BarChart3 className="w-4 h-4 mr-2" />Reputation</TabsTrigger>
        </TabsList>

        <TabsContent value="insights" className="space-y-4">
          <InsightDashboard />
        </TabsContent>

        <TabsContent value="forecast" className="space-y-4">
          <ForecastAdminPanel />
        </TabsContent>

        <TabsContent value="classification" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Topic Classification AI</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600">
                Automatically categorize polls and extract relevant tags using AI analysis
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-2xl font-bold text-slate-900">{recentPolls.length}</p>
                  <p className="text-xs text-slate-600">Recent polls</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-600">
                    {recentPolls.filter((p) => !p.tags || p.tags.length === 0).length}
                  </p>
                  <p className="text-xs text-slate-600">Unclassified</p>
                </div>
              </div>
              <Button
                onClick={handleClassifyPolls}
                disabled={processing}
                className="w-full"
              >
                {processing ? "Processing..." : "Classify Recent Polls"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="moderation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Automated Moderation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600">
                AI-powered content scanning for policy violations and harmful content
              </p>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-2xl font-bold text-orange-600">{flaggedContent.length}</p>
                  <p className="text-xs text-slate-600">Open reports</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600">
                    {flaggedContent.filter((r) => r.priority === "high" || r.priority === "critical").length}
                  </p>
                  <p className="text-xs text-slate-600">High priority</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{recentPolls.length}</p>
                  <p className="text-xs text-slate-600">To scan</p>
                </div>
              </div>
              <Button
                onClick={handleAutoModerate}
                disabled={processing}
                className="w-full bg-orange-600 hover:bg-orange-700"
              >
                {processing ? "Scanning..." : "Run Auto-Moderation Scan"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reputation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Reputation Engine</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600">
                Advanced reputation scoring based on engagement, quality, and peer ratings
              </p>
              <Alert className="border-blue-200 bg-blue-50">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-sm text-blue-800">
                  Reputation scores combine comment quality, peer ratings, engagement metrics, and content quality
                </AlertDescription>
              </Alert>
              <Button
                onClick={handleRecalculateReputation}
                disabled={processing}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {processing ? "Calculating..." : "Recalculate Reputation Scores"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}