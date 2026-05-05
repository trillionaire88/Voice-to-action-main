import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { api } from '@/api/client';
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  FileText,
  MapPin,
  Target,
  Users,
  CheckCircle2,
  Share2,
  ExternalLink,
  Calendar,
  Clock,
  AlertTriangle,
  ArrowLeft,
  Shield,
  Send,
  Mail,
  Pencil,
  Download,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonDetail } from "@/components/ui/SkeletonCard";
import CommentThread from "../components/comments/CommentThread";
import DonationSection from "../components/charity/DonationSection";
import PetitionEscalationTracker from "../components/petitions/PetitionEscalationTracker";
import ReportButton from "../components/moderation/ReportButton";
import SignPetitionModal from "../components/petitions/SignPetitionModal";
import SignatureTransparencyBar from "../components/petitions/SignatureTransparencyBar";
import DeliveryStatusCard from "../components/petitions/DeliveryStatusCard";
import RequestDeliveryModal from "../components/petitions/RequestDeliveryModal";
import CredibilityBreakdown from "../components/petitions/CredibilityBreakdown";
import CredibilityAdminPanel from "../components/petitions/CredibilityAdminPanel";
import PetitionSupportMap from "../components/petitions/PetitionSupportMap";
import SupportDistributionCharts from "../components/petitions/SupportDistributionCharts";
import OpinionStrengthIndicator from "../components/petitions/OpinionStrengthIndicator";
import GeoAnalyticsAdminPanel from "../components/petitions/GeoAnalyticsAdminPanel";
import PetitionAnalyticsDashboard from "../components/petitions/PetitionAnalyticsDashboard";
import CongressSignatureList from "../components/congress/CongressSignatureList";
import EditPetitionModal from "../components/petitions/EditPetitionModal";
import SocialShareButtons from "../components/social/SocialShareButtons";
import ExportSignersButton from "../components/petitions/ExportSignersButton";
import PetitionPDFReport from "../components/petitions/PetitionPDFReport";
import PetitionCreatorCard from "../components/petitions/PetitionCreatorCard";
import MilestoneCelebration from "@/components/petitions/MilestoneCelebration";
import EmbedCodeModal from "@/components/petitions/EmbedCodeModal";
import TrustScorePanel from "@/components/trust/TrustScorePanel";
import SignatureCertificate from "@/components/petitions/SignatureCertificate";

export default function PetitionDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  function safeId(raw) {
    if (!raw) return null;
    const clean = String(raw).replace(/[^a-zA-Z0-9\-_]/g, "");
    return clean.length > 0 && clean.length < 128 ? clean : null;
  }
  const petitionId = safeId(urlParams.get("id"));

  const { user } = useAuth();
  const [showSignModal, setShowSignModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEmbedModal, setShowEmbedModal] = useState(false);
  const [translated, setTranslated] = useState("");


  const { data: petition, isLoading: petitionLoading } = useQuery({
    queryKey: ["petition", petitionId],
    queryFn: async () => {
      const petitions = await api.entities.Petition.filter({ id: petitionId });
      if (petitions.length === 0) throw new Error("Petition not found");
      return petitions[0];
    },
    enabled: !!petitionId,
    staleTime: 60_000,
  });

  const { data: signatures = [] } = useQuery({
    queryKey: ["petitionSignatures", petitionId],
    queryFn: () => api.entities.PetitionSignature.filter({ petition_id: petitionId }),
    staleTime: 30_000,
    enabled: !!petitionId,
  });

  const { data: mySignature } = useQuery({
    queryKey: ["mySignature", petitionId, user?.id],
    queryFn: async () => {
      if (!user) return null;
      const sigs = await api.entities.PetitionSignature.filter({
        petition_id: petitionId,
        user_id: user.id,
      });
      return sigs.length > 0 ? sigs[0] : null;
    },
    enabled: !!petitionId && !!user,
    staleTime: 5 * 60_000,
  });

  const { data: deliveries = [] } = useQuery({
    queryKey: ["petitionDeliveries", petitionId],
    queryFn: () => api.entities.PetitionDelivery.filter({ petition_id: petitionId }, "-created_date"),
    enabled: !!petitionId,
    staleTime: 2 * 60_000,
  });

  const { data: withdrawalRecord } = useQuery({
    queryKey: ["withdrawalRecord", petitionId, user?.id],
    queryFn: () => api.entities.PetitionWithdrawal.filter({ petition_id: petitionId, user_id: user?.id }),
    enabled: !!petitionId && !!user,
  });

  const { data: credibility } = useQuery({
    queryKey: ["credibility", petitionId],
    queryFn: async () => {
      const results = await api.entities.CredibilityScore.filter({ petition_id: petitionId });
      return results[0] || null;
    },
    enabled: !!petitionId,
    staleTime: 5 * 60_000,
  });

  const { data: escalation } = useQuery({
    queryKey: ["petitionEscalation", petitionId],
    queryFn: async () => {
      const escalations = await api.entities.PetitionEscalation.filter({
        petition_id: petitionId,
      });
      return escalations.length > 0 ? escalations[0] : null;
    },
    enabled: !!petitionId,
    staleTime: 5 * 60_000,
  });

  // Handle email confirmation token from URL
  useEffect(() => {
    const confirmToken = urlParams.get("confirm_sig");
    if (!confirmToken || !petitionId) return;
    const safeToken = String(confirmToken).replace(/[^a-zA-Z0-9\-_]/g, "").slice(0, 128);
    if (!safeToken) return;
    (async () => {
      const sigs = await api.entities.PetitionSignature.filter({ confirmation_token: safeToken, petition_id: petitionId });
      if (sigs.length > 0 && !sigs[0].is_email_confirmed) {
        await api.entities.PetitionSignature.update(sigs[0].id, {
          is_email_confirmed: true,
          confirmed_at: new Date().toISOString(),
        });
        toast.success("Your signature has been confirmed! Thank you.");
        queryClient.invalidateQueries(["mySignature"]);
      }
    })();
  }, [petitionId]);

  const handleShare = async () => {
    const url = window.location.href;
    const shareData = {
      title: petition?.title || "Petition",
      text: petition?.short_summary || "Sign this petition on Voice to Action",
      url,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard!");
      }
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard!");
      } catch {
        toast.error("Could not copy link");
      }
    }
  };

  const submitPetitionMutation = useMutation({
    mutationFn: async (emailChoice) => {
      const { data, error } = await supabase.functions.invoke("submit-petition-delivery", {
        body: { petition_id: petitionId, email_choice: emailChoice },
      });
      if (error) {
        let msg = error.message || "Failed to submit petition";
        try {
          const ctx = error.context;
          if (ctx && typeof ctx.json === "function") {
            const j = await ctx.json();
            if (j?.error) msg = j.error;
          }
        } catch {
          /* ignore */
        }
        throw new Error(msg);
      }
      return data?.sent_to ?? "";
    },
    onSuccess: (email) => {
      queryClient.invalidateQueries(["petition", petitionId]);
      toast.success(`Petition sent to ${email}!`);
    },
    onError: () => {
      toast.error("Failed to submit petition");
    },
  });

  if (!petitionId || petitionLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12">
        <SkeletonDetail />
      </div>
    );
  }

  if (!petition) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <AlertTriangle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Petition Not Found</h2>
        <Button onClick={() => navigate(createPageUrl("Petitions"))}>
          Back to Petitions
        </Button>
      </div>
    );
  }

  const progress = ((petition.signature_count_total || 0) / (petition.signature_goal || 1000)) * 100;
  const canSign = user && !mySignature && petition.status === 'active';
  const hasSigned = !!mySignature && !mySignature.has_withdrawn;
  const isCreator = user && petition.creator_user_id === user.id;
  const hasWithdrawalPaid = isCreator && (
    (withdrawalRecord && withdrawalRecord.length > 0) ||
    user?.email === 'jeremywhisson@gmail.com'
  );
  const isAdmin = user?.role === "admin";
  const isCongressMember = user?.role === "congress_member" || user?.role === "organization_viewer";
  const submissionThreshold = petition.submission_threshold || 60000;
  const canSubmit = isCreator && petition.signature_count_verified >= submissionThreshold && petition.status === 'active';
  const MIN_VERIFIED_FOR_DELIVERY = 100000;
  const canRequestDelivery = isCreator && petition.status === 'active' && (petition.signature_count_verified || 0) >= MIN_VERIFIED_FOR_DELIVERY;

  // Geo stats for opinion strength
  const geoCountries = [...new Set(signatures.filter(s => !s.is_invalidated && !s.has_withdrawn).map(s => s.country_code).filter(Boolean))].length;
  const sigs24h = signatures.filter(s => !s.is_invalidated && !s.has_withdrawn && (Date.now() - new Date(s.created_date).getTime()) < 86400000).length;

  return (
    <div className="w-full md:max-w-5xl md:mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-12">
      <Button
        variant="ghost"
        onClick={() => navigate(createPageUrl("Petitions"))}
        className="mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Petitions
      </Button>

      {/* Header */}
      <Card className="border-slate-200 mb-6">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{(petition.category || 'other').replace(/_/g, ' ')}</Badge>
            <Badge variant="outline">
              <MapPin className="w-3 h-3 mr-1" />
              {petition.country_code}
              {petition.region_code && ` • ${petition.region_code}`}
            </Badge>
            <Badge variant="outline">
              <Target className="w-3 h-3 mr-1" />
              {(petition.target_type || 'other').replace(/_/g, ' ')}
            </Badge>
            {petition.status === 'delivered' && (
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                Delivered
              </Badge>
            )}
          </div>

          <h1 className="text-3xl font-bold text-slate-900 leading-tight">
            {petition.title}
          </h1>

          <p className="text-lg text-slate-700 leading-relaxed">
            {petition.short_summary}
          </p>

          <PetitionCreatorCard petition={petition} viewerUser={user} />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Target className="w-4 h-4" />
              <span className="font-semibold">Target: {petition.target_name}</span>
            </div>
            <ReportButton
              targetType="petition"
              targetId={petitionId}
              targetPreview={petition.title + " — " + petition.short_summary}
              targetAuthorId={petition.creator_user_id}
              currentUserId={user?.id}
            />
          </div>

          <Separator />

          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              Started {format(new Date(petition.created_date), 'MMM d, yyyy')}
            </span>
            {petition.deadline && (
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Ends {format(new Date(petition.deadline), 'MMM d, yyyy')}
              </span>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Petition Image */}
          {petition.image_url && (
            <Card className="border-slate-200 overflow-hidden">
              <img src={petition.image_url} alt={petition.title} className="w-full max-h-72 object-cover" />
            </Card>
          )}

          {/* Description */}
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle>What This Petition Is About</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-slate max-w-none">
              <div className="whitespace-pre-wrap text-slate-700 leading-relaxed">
                {petition.full_description}
              </div>
            </CardContent>
          </Card>

          {/* Requested Action */}
          <Card className="border-blue-200 bg-blue-50/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Requested Action
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-900 font-medium leading-relaxed">
                {petition.requested_action}
              </p>
            </CardContent>
          </Card>

          {/* Supporting Documents */}
          {petition.supporting_documents && petition.supporting_documents.length > 0 && (
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ExternalLink className="w-5 h-5" />
                  Supporting Documents
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {petition.supporting_documents.map((doc, idx) => (
                  <a
                    key={idx}
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    <ExternalLink className="w-4 h-4" />
                    {doc.title || `Document ${idx + 1}`}
                  </a>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Support Map */}
          {signatures.length > 0 && (
            <PetitionSupportMap signatures={signatures} petition={petition} />
          )}

          {/* Support Distribution Charts */}
          {signatures.length > 0 && (
            <SupportDistributionCharts signatures={signatures} />
          )}

          {/* Delivery Info */}
          {petition.status === 'delivered' && deliveries.length > 0 && (
            <Card className="border-emerald-200 bg-emerald-50/30">
              <CardHeader>
                <CardTitle className="text-emerald-900 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />Petition Delivered
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-emerald-800 space-y-2">
                <p>
                  This petition was officially delivered to <strong>{deliveries[0]?.recipient_organisation || petition.target_name}</strong>
                  {petition.delivered_at && <> on {format(new Date(petition.delivered_at), 'PPP')}</>}.
                </p>
                {deliveries[0]?.delivery_confirmation && (
                  <p className="text-xs text-emerald-700">{deliveries[0].delivery_confirmation}</p>
                )}
                {petition.outcome_notes && (
                  <div className="mt-4 p-3 bg-white rounded-lg">
                    <h4 className="font-semibold mb-1">Response/Outcome:</h4>
                    <p>{petition.outcome_notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Signature Section */}
          <Card className="border-slate-200">
            <CardContent className="pt-6 space-y-4">
              <div>
                <div className="text-3xl font-bold text-slate-900 mb-1">
                  {(petition.signature_count_total || 0).toLocaleString()}
                </div>
                <div className="text-sm text-slate-600 mb-3">
                  of {(petition.signature_goal || 1000).toLocaleString()} signatures
                </div>
                <Progress value={Math.min(progress, 100)} className="h-3" />

                {/* Delivery milestone indicator */}
                {(petition.signature_count_verified || 0) < 60000 && petition.status === 'active' && (
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>Verified signatures toward official delivery</span>
                      <span className="font-semibold text-emerald-600">
                        {(petition.signature_count_verified || 0).toLocaleString()} / 60,000
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${Math.min(((petition.signature_count_verified || 0) / 60000) * 100, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      60,000 verified signatures triggers official government delivery
                    </p>
                  </div>
                )}
                {(petition.signature_count_verified || 0) >= 60000 && (
                  <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2 mt-2">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <p className="text-xs font-semibold">Delivery threshold reached!</p>
                  </div>
                )}
              </div>

              {canSign ? (
                <Button
                  onClick={() => setShowSignModal(true)}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                  size="lg"
                >
                  Sign This Petition
                </Button>
              ) : hasSigned ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2 text-emerald-700 bg-emerald-50 py-3 rounded-lg">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="font-semibold">You signed this petition</span>
                  </div>
                  {!mySignature?.is_email_confirmed && (
                    <p className="text-xs text-amber-700 text-center bg-amber-50 py-2 px-3 rounded-lg">
                      ⚠️ Please check your email and click the confirmation link to validate your signature.
                    </p>
                  )}
                </div>
              ) : !user ? (
                <Button
                  onClick={() => api.auth.redirectToLogin(window.location.pathname + window.location.search)}
                  className="w-full"
                  size="lg"
                >
                  Sign In to Sign
                </Button>
              ) : null}

              <SocialShareButtons title={petition?.title} url={window.location.href} />
              <Button variant="outline" onClick={() => setShowEmbedModal(true)} className="w-full">Embed</Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={async () => {
                  const { data: { session } } = await supabase.auth.getSession();
                  if (!session) return;
                  const { data } = await supabase.functions.invoke("translate-content", {
                    body: {
                      content: `${petition.title}\n\n${petition.full_description || ""}`,
                      targetLanguage: navigator.language || "en",
                    },
                  });
                  setTranslated(data?.translated || "");
                }}
              >
                Translate
              </Button>

              {isCreator && signatures.length > 0 && (
                <ExportSignersButton petition={petition} signatures={signatures} hasPaid={hasWithdrawalPaid} />
              )}

              {isCreator && (
                <PetitionPDFReport petition={petition} signatures={signatures} />
              )}

              {isCreator && petition.status === 'active' && (
                <Button
                  variant="outline"
                  onClick={() => setShowEditModal(true)}
                  className="w-full border-slate-300 text-slate-700"
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit Petition
                </Button>
              )}

              {isCreator && petition.status === 'active' && (
                <div className="pt-2 border-t border-slate-200">
                  <button
                    onClick={() => navigate(createPageUrl("PetitionWithdraw") + `?id=${petitionId}`)}
                    className="w-full text-sm text-slate-600 hover:text-blue-700 underline text-center block py-2"
                  >
                    Withdraw Petition & Deliver Personally →
                  </button>
                </div>
              )}

              {canSubmit && (
                <div className="space-y-2">
                  <div className="text-xs text-center text-emerald-700 font-medium bg-emerald-50 py-2 rounded-lg">
                    <CheckCircle2 className="w-4 h-4 inline mr-1" />
                    {submissionThreshold.toLocaleString()}+ verified signatures reached!
                  </div>
                  <Button
                    onClick={() => submitPetitionMutation.mutate('creator')}
                    disabled={submitPetitionMutation.isPending}
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Send to My Email
                  </Button>
                  <Button
                    onClick={() => submitPetitionMutation.mutate('platform')}
                    disabled={submitPetitionMutation.isPending}
                    variant="outline"
                    className="w-full"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Send to Platform Team
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats */}
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-sm">Signature Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Total Signatures:</span>
                <span className="font-semibold">{(petition.signature_count_total || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Verified Users:</span>
                <span className="font-semibold text-emerald-600">
                  {(petition.signature_count_verified || 0).toLocaleString()}
                </span>
              </div>
              {(petition.signature_count_total || 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Verification Rate:</span>
                  <span className="font-semibold">
                    {Math.round(((petition.signature_count_verified || 0) / (petition.signature_count_total || 1)) * 100)}%
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Legal Notice */}
          <Card className="border-blue-200 bg-blue-50/30">
            <CardContent className="pt-4 text-xs text-blue-800">
              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p>
                  Signatures are kept private and used only to demonstrate public support for this cause.
                  Your signature will not be publicly displayed.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Delivery Status */}
          <DeliveryStatusCard deliveries={deliveries} />

          {/* Request Delivery (creator only, threshold reached) */}
          {isCreator && petition.status === 'active' && (
            <div className="pt-2">
              {canRequestDelivery ? (
                <Button
                  variant="outline"
                  className="w-full border-blue-300 text-blue-700 hover:bg-blue-50"
                  onClick={() => setShowDeliveryModal(true)}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Request Official Delivery
                </Button>
              ) : (
                <div className="space-y-2">
                  <Button
                    disabled
                    variant="outline"
                    className="w-full opacity-50 cursor-not-allowed"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Request Official Delivery
                  </Button>
                  <p className="text-xs text-amber-700 text-center bg-amber-50 px-3 py-2 rounded-lg">
                    Requires {MIN_VERIFIED_FOR_DELIVERY.toLocaleString()} verified signatures
                    {(petition.signature_count_verified || 0) > 0 && ` (${MIN_VERIFIED_FOR_DELIVERY - (petition.signature_count_verified || 0)} more needed)`}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Opinion Strength Indicator */}
          <Card className="border-slate-200">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Opinion Strength</p>
              <OpinionStrengthIndicator
                totalSigs={petition.signature_count_total}
                countries={geoCountries}
                verifiedSigs={petition.signature_count_verified}
                sigGrowth24h={sigs24h}
                credibilityScore={credibility?.overall_score}
              />
            </CardContent>
          </Card>

          {/* Analytics dashboard — visible to creator + admin */}
          {(isCreator || isAdmin) && (
            <PetitionAnalyticsDashboard petitionId={petitionId} />
          )}

          {/* Credibility Score - public */}
          <CredibilityBreakdown credibility={credibility} petition={petition} />

          {/* Admin-only credibility analysis */}
          {isAdmin && (
            <CredibilityAdminPanel petitionId={petitionId} petition={petition} />
          )}

          {/* Admin-only geo analytics */}
          {isAdmin && signatures.length > 0 && (
            <GeoAnalyticsAdminPanel signatures={signatures} petition={petition} />
          )}

          {/* Signature Transparency */}
          <SignatureTransparencyBar petition={petition} />
          <TrustScorePanel petition={petition} />
          {mySignature && (
            <SignatureCertificate
              petitionTitle={petition.title}
              signerName={mySignature.signer_name || "Anonymous Supporter"}
              verificationCode={mySignature.confirmation_token || mySignature.id}
            />
          )}

          {/* Congress Member: Verified Signers List */}
          {isCongressMember && (
           <CongressSignatureList signatures={signatures} />
          )}

          {/* Escalation Tracker */}
          <PetitionEscalationTracker petition={petition} escalation={escalation} />
        </div>
      </div>

      {/* Donations */}
      <div className="mb-6">
        <DonationSection petitionId={petitionId} user={user} />
      </div>

      {/* Comments */}
      <CommentThread pollId={petitionId} user={user} />
      {translated && (
        <Card className="border-slate-200 mt-4">
          <CardHeader><CardTitle className="text-base">Translated</CardTitle></CardHeader>
          <CardContent><p className="text-sm whitespace-pre-wrap">{translated}</p></CardContent>
        </Card>
      )}
      <MilestoneCelebration petitionId={petitionId} title={petition?.title} count={petition?.signature_count_total || 0} />
      <EmbedCodeModal open={showEmbedModal} onOpenChange={setShowEmbedModal} petitionId={petitionId} />

      {/* Delivery Modal */}
      {showDeliveryModal && (
        <RequestDeliveryModal
          petition={petition}
          user={user}
          onClose={() => setShowDeliveryModal(false)}
        />
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <EditPetitionModal
          petition={petition}
          onClose={() => setShowEditModal(false)}
          onSaved={() => queryClient.invalidateQueries(["petition", petitionId])}
        />
      )}

      {/* Sign Modal */}
      {showSignModal && (
        <SignPetitionModal
          petition={petition}
          user={user}
          onClose={() => setShowSignModal(false)}
          onSuccess={() => {
            queryClient.invalidateQueries(["petition", petitionId]);
            queryClient.invalidateQueries(["mySignature"]);
          }}
        />
      )}


    </div>
  );
}