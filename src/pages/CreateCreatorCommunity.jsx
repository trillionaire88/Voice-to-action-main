import React, { useState, useEffect } from "react";
import { api } from '@/api/client';
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  CheckCircle2,
  AlertCircle,
  Shield,
  Globe2,
  Users,
  Link as LinkIcon,
  Plus,
  X,
  Sparkles,
  FileText,
  Lock,
} from "lucide-react";

const CREATOR_TYPES = [
  { value: "individual_creator", label: "Individual Creator", description: "Solo content creator or commentator" },
  { value: "creator_collective", label: "Creator Collective", description: "Group of creators working together" },
  { value: "media_project", label: "Media Project", description: "Publication, podcast, or media initiative" },
  { value: "political_commentator", label: "Political Commentator", description: "Political analysis and commentary" },
  { value: "research_group", label: "Research Group", description: "Academic or independent research" },
  { value: "educational_initiative", label: "Educational Initiative", description: "Teaching and education focused" },
  { value: "cross_platform_collaboration", label: "Cross-Platform Collaboration", description: "Multi-creator partnership" },
];

const PLATFORMS = [
  { value: "youtube", label: "YouTube", icon: "🎥" },
  { value: "twitter", label: "X / Twitter", icon: "🐦" },
  { value: "instagram", label: "Instagram", icon: "📷" },
  { value: "tiktok", label: "TikTok", icon: "🎵" },
  { value: "facebook", label: "Facebook", icon: "👥" },
  { value: "linkedin", label: "LinkedIn", icon: "💼" },
  { value: "substack", label: "Substack", icon: "📰" },
  { value: "medium", label: "Medium", icon: "✍️" },
  { value: "podcast", label: "Podcast", icon: "🎙️" },
  { value: "website", label: "Website", icon: "🌐" },
  { value: "academic", label: "Academic Profile", icon: "🎓" },
  { value: "custom", label: "Other Platform", icon: "🔗" },
];

export default function CreateCreatorCommunity() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Basic Info
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [creatorType, setCreatorType] = useState("");
  const [publicDescription, setPublicDescription] = useState("");
  const [mission, setMission] = useState("");

  // Platform Links
  const [platforms, setPlatforms] = useState([]);
  const [currentPlatform, setCurrentPlatform] = useState("");
  const [currentPlatformUrl, setCurrentPlatformUrl] = useState("");
  const [customPlatformName, setCustomPlatformName] = useState("");

  // Transparency (optional)
  const [enableTransparency, setEnableTransparency] = useState(false);
  const [fundingSources, setFundingSources] = useState("");
  const [sponsorships, setSponsorships] = useState("");
  const [politicalAlignment, setPoliticalAlignment] = useState("");
  const [conflictsOfInterest, setConflictsOfInterest] = useState("");

  // Terms
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (name) {
      const generatedSlug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      setSlug(generatedSlug);
    }
  }, [name]);

  const loadUser = async () => {
    try {
      const currentUser = await api.auth.me();
      if (!currentUser.is_email_verified && !currentUser.is_phone_verified) {
        navigate(createPageUrl("SecuritySettings"));
        return;
      }
      setUser(currentUser);
    } catch (error) {
      navigate(createPageUrl("Home"));
    } finally {
      setLoading(false);
    }
  };

  const addPlatform = () => {
    if (!currentPlatform || !currentPlatformUrl) {
      toast.error("Please select a platform and enter a URL");
      return;
    }
    if (currentPlatform === "custom" && !customPlatformName.trim()) {
      toast.error("Please enter a name for the custom platform");
      return;
    }
    
    setPlatforms([
      ...platforms,
      {
        platform: currentPlatform === "custom" ? customPlatformName : currentPlatform,
        url: currentPlatformUrl,
        verified: false,
      },
    ]);
    setCurrentPlatform("");
    setCurrentPlatformUrl("");
    setCustomPlatformName("");
  };

  const removePlatform = (index) => {
    setPlatforms(platforms.filter((_, i) => i !== index));
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      // Create community first
      const community = await api.entities.Community.create({
        name,
        slug,
        community_type: "verified_creator",
        is_creator_community: true,
        description_public: publicDescription,
        founder_user_id: user.id,
        status: "active",
        geographic_scope: "global",
        visibility: "public",
        join_policy: "open",
        governance_model: "founder_led",
      });

      // Create creator profile
      const creatorProfile = await api.entities.CreatorProfile.create({
        community_id: community.id,
        user_id: user.id,
        creator_type: creatorType,
        verification_level: "pending",
        linked_platforms: platforms,
        transparency_disclosures: enableTransparency
          ? {
              funding_sources: fundingSources.split("\n").filter((s) => s.trim()),
              sponsorships: sponsorships.split("\n").filter((s) => s.trim()),
              political_alignment: politicalAlignment,
              conflicts_of_interest: conflictsOfInterest.split("\n").filter((s) => s.trim()),
            }
          : {},
        custom_layout: {
          sections: [
            { id: "about", type: "about", title: "About", order: 0, visible: true },
            { id: "polls", type: "active_polls", title: "Active Polls", order: 1, visible: true },
            { id: "content", type: "longform_posts", title: "Content", order: 2, visible: true },
          ],
        },
        terms_accepted: true,
        terms_accepted_at: new Date().toISOString(),
      });

      // Update community with creator profile link
      await api.entities.Community.update(community.id, {
        creator_profile_id: creatorProfile.id,
      });

      // Submit identity verification
      await api.entities.CreatorVerification.create({
        creator_profile_id: creatorProfile.id,
        verification_type: "identity",
        verification_method: "manual_review",
        status: "pending",
      });

      return community;
    },
    onSuccess: (community) => {
      toast.success("Creator community created! Verification pending.");
      navigate(createPageUrl("CommunityDetail") + `?id=${community.id}`);
    },
    onError: (error) => {
      console.error(error);
      setError("Failed to create creator community. Please try again.");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Please enter a community name");
      return;
    }
    if (!creatorType) {
      setError("Please select a creator type");
      return;
    }
    if (!publicDescription.trim()) {
      setError("Please enter a description");
      return;
    }
    if (platforms.length === 0) {
      setError("Please add at least one external platform link");
      return;
    }
    if (!acceptedTerms) {
      setError("You must accept the Creator Community Terms");
      return;
    }

    createMutation.mutate();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-slate-50 mb-8">
        <CardContent className="pt-8 pb-6">
          <div className="text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-full mb-4">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-semibold">Verified Creator Program</span>
            </div>
            <h1 className="text-4xl font-bold text-slate-900 mb-3">
              Create Your Creator Community
            </h1>
            <p className="text-lg text-slate-700 mb-6">
              Bring your audience to Voice to Action for serious civic participation, structured decision-making, and transparent collaboration.
            </p>

            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2 justify-center text-emerald-700">
                <CheckCircle2 className="w-4 h-4" />
                <span>Verified identity</span>
              </div>
              <div className="flex items-center gap-2 justify-center text-blue-700">
                <Shield className="w-4 h-4" />
                <span>Platform integrity</span>
              </div>
              <div className="flex items-center gap-2 justify-center text-purple-700">
                <Users className="w-4 h-4" />
                <span>No influence manipulation</span>
              </div>
            </div>

            <Alert className="mt-6 border-blue-300 bg-blue-50/50 text-left">
              <FileText className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-900">
                <strong>Creator communities</strong> enable you to mobilize your audience toward constructive civic action while maintaining full editorial independence. Followers do not increase voting weight, and all actions are auditable.
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              This information will be public and displayed on your creator community page
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Community Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Policy Matters with Sarah Chen"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">URL Slug *</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">everyvoice.com/creator/</span>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Creator Type *</Label>
              <Select value={creatorType} onValueChange={setCreatorType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select creator type" />
                </SelectTrigger>
                <SelectContent>
                  {CREATOR_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div>
                        <div className="font-medium">{type.label}</div>
                        <div className="text-xs text-slate-500">{type.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Public Description *</Label>
              <Textarea
                id="description"
                placeholder="Describe your creator community, mission, and focus areas..."
                value={publicDescription}
                onChange={(e) => setPublicDescription(e.target.value)}
                rows={4}
                maxLength={500}
              />
              <p className="text-xs text-slate-500">{publicDescription.length}/500 characters</p>
            </div>
          </CardContent>
        </Card>

        {/* External Platform Links */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="w-5 h-5" />
              External Platform Links
            </CardTitle>
            <CardDescription>
              Link your existing platforms to prove authenticity (at least one required)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex gap-2">
                <Select value={currentPlatform} onValueChange={setCurrentPlatform}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map((platform) => (
                      <SelectItem key={platform.value} value={platform.value}>
                        {platform.icon} {platform.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="https://..."
                  value={currentPlatformUrl}
                  onChange={(e) => setCurrentPlatformUrl(e.target.value)}
                  className="flex-1"
                />
                <Button type="button" onClick={addPlatform} variant="outline">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {currentPlatform === "custom" && (
                <Input
                  placeholder="Platform name (e.g., Twitch, Discord, Patreon)"
                  value={customPlatformName}
                  onChange={(e) => setCustomPlatformName(e.target.value)}
                  className="w-full"
                />
              )}
            </div>

            {platforms.length > 0 && (
              <div className="space-y-2">
                {platforms.map((platform, index) => {
                  const platformInfo = PLATFORMS.find((p) => p.value === platform.platform);
                  const displayName = platformInfo ? platformInfo.label : platform.platform;
                  const displayIcon = platformInfo ? platformInfo.icon : "🔗";
                  
                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <span>{displayIcon}</span>
                        <span className="font-medium text-sm">{displayName}</span>
                        <span className="text-xs text-slate-500 truncate max-w-xs">
                          {platform.url}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          Pending Verification
                        </Badge>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removePlatform(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}

            <Alert className="border-amber-200 bg-amber-50">
              <Shield className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-900 text-sm">
                Platform links will be verified after submission. You may be asked to post a verification code or sign in via OAuth.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Transparency Disclosures (Optional) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe2 className="w-5 h-5" />
              Transparency Disclosures (Optional)
            </CardTitle>
            <CardDescription>
              Voluntary disclosures build trust and credibility with your audience
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="transparency"
                checked={enableTransparency}
                onCheckedChange={setEnableTransparency}
              />
              <Label htmlFor="transparency" className="cursor-pointer">
                Enable public transparency disclosures
              </Label>
            </div>

            {enableTransparency && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="funding">Funding Sources (one per line)</Label>
                  <Textarea
                    id="funding"
                    placeholder="e.g., Patreon subscriptions, Foundation grants, etc."
                    value={fundingSources}
                    onChange={(e) => setFundingSources(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sponsors">Sponsorships (one per line)</Label>
                  <Textarea
                    id="sponsors"
                    placeholder="List any current sponsorships or partnerships"
                    value={sponsorships}
                    onChange={(e) => setSponsorships(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="alignment">Political Alignment (optional)</Label>
                  <Input
                    id="alignment"
                    placeholder="e.g., Progressive, Conservative, Independent, Non-partisan"
                    value={politicalAlignment}
                    onChange={(e) => setPoliticalAlignment(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="conflicts">Conflicts of Interest (one per line)</Label>
                  <Textarea
                    id="conflicts"
                    placeholder="Disclose any potential conflicts of interest"
                    value={conflictsOfInterest}
                    onChange={(e) => setConflictsOfInterest(e.target.value)}
                    rows={3}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Terms & Submission */}
        <Card className="border-slate-300">
          <CardContent className="pt-6 space-y-4">
            <Alert className="border-red-200 bg-red-50">
              <Lock className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-900 text-sm">
                <strong>Creator Community Terms:</strong> By creating a creator community, you agree to:
                <ul className="mt-2 ml-4 space-y-1 text-xs">
                  <li>• Maintain platform neutrality and civic standards</li>
                  <li>• Not manipulate voting or engagement</li>
                  <li>• Not sell or monetize civic actions</li>
                  <li>• Submit to platform integrity rules</li>
                  <li>• Accept that followers do not increase voting weight</li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="flex items-start gap-2">
              <Checkbox
                id="terms"
                checked={acceptedTerms}
                onCheckedChange={setAcceptedTerms}
              />
              <Label htmlFor="terms" className="text-sm cursor-pointer">
                I have read and accept the Creator Community Terms, and understand that this community will be subject to verification and ongoing moderation
              </Label>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(createPageUrl("Communities"))}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!acceptedTerms || createMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {createMutation.isPending ? "Creating..." : "Submit for Review"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}