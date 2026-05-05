import React, { useState, useEffect } from "react";
import { api } from '@/api/client';
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building2,
  CheckCircle2,
  Globe2,
  FileText,
  BarChart3,
  ArrowLeft,
  ExternalLink,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function InstitutionProfile() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const institutionId = urlParams.get("id");

  const { data: institution, isLoading } = useQuery({
    queryKey: ["institution", institutionId],
    queryFn: async () => {
      const institutions = await api.entities.Institution.filter({ id: institutionId });
      return institutions[0];
    },
    enabled: !!institutionId,
  });

  const { data: trustScore } = useQuery({
    queryKey: ["institutionTrust", institutionId],
    queryFn: async () => {
      const scores = await api.entities.InstitutionTrustScore.filter({
        institution_id: institutionId,
      });
      return scores[0];
    },
    enabled: !!institutionId,
  });

  const { data: decisions = [] } = useQuery({
    queryKey: ["institutionDecisions", institutionId],
    queryFn: () =>
      api.entities.DecisionPoll.filter({ institution_id: institutionId }, "-created_date"),
    enabled: !!institutionId,
  });

  const { data: petitions = [] } = useQuery({
    queryKey: ["institutionPetitions", institutionId],
    queryFn: async () => {
      const allPetitions = await api.entities.Petition.list("-created_date");
      return allPetitions.filter((p) => p.target_name === institution?.name);
    },
    enabled: !!institution,
  });

  if (!institutionId) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <p>Institution not found</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12">
        <Skeleton className="h-48 w-full mb-6" />
        <Skeleton className="h-8 w-1/2 mb-4" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const getTrustColor = (score) => {
    if (score >= 80) return "text-emerald-600 bg-emerald-50 border-emerald-200";
    if (score >= 60) return "text-blue-600 bg-blue-50 border-blue-200";
    if (score >= 40) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Button
        variant="ghost"
        onClick={() => navigate(createPageUrl("Home"))}
        className="ml-4 mt-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      {/* Banner */}
      <div
        className="h-48 bg-gradient-to-r from-blue-600 to-blue-800"
        style={{
          backgroundImage: institution?.banner_url ? `url(${institution.banner_url})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      <div className="max-w-6xl mx-auto px-4 -mt-20">
        <Card className="border-2 shadow-xl">
          <CardContent className="pt-6">
            <div className="flex items-start gap-6">
              {/* Logo */}
              <div className="bg-white rounded-xl p-4 shadow-md">
                {institution?.logo_url ? (
                  <img
                    src={institution.logo_url}
                    alt={institution.name}
                    className="w-24 h-24 object-contain"
                  />
                ) : (
                  <Building2 className="w-24 h-24 text-slate-400" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-slate-900">{institution?.name}</h1>
                  {institution?.verification_status === "verified" && (
                    <CheckCircle2 className="w-7 h-7 text-blue-600" />
                  )}
                </div>

                <div className="flex flex-wrap gap-2 mb-3">
                  <Badge className="bg-blue-100 text-blue-700">
                    {institution?.institution_type?.replace(/_/g, " ")}
                  </Badge>
                  <Badge variant="outline">
                    <Globe2 className="w-3 h-3 mr-1" />
                    {institution?.country_code}
                  </Badge>
                </div>

                <p className="text-slate-600 mb-4">{institution?.short_bio}</p>

                {institution?.website_url && (
                  <a
                    href={institution.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline flex items-center gap-1 text-sm"
                  >
                    {institution.website_url}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              {/* Trust Score */}
              {trustScore && (
                <Card className={`border-2 ${getTrustColor(trustScore.overall_trust_score)}`}>
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl font-bold mb-1">
                      {Math.round(trustScore.overall_trust_score)}
                    </div>
                    <div className="text-xs font-semibold">Trust Score</div>
                  </CardContent>
                </Card>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Content Tabs */}
        <Tabs defaultValue="decisions" className="mt-8 mb-12">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="decisions">Decisions</TabsTrigger>
            <TabsTrigger value="petitions">Petitions</TabsTrigger>
            <TabsTrigger value="trust">Trust Breakdown</TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
          </TabsList>

          <TabsContent value="decisions" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Decision Polls
                </CardTitle>
              </CardHeader>
              <CardContent>
                {decisions.length === 0 ? (
                  <p className="text-slate-600 text-center py-8">No decisions posted yet</p>
                ) : (
                  <div className="space-y-3">
                    {decisions.map((decision) => (
                      <Card key={decision.id} className="border hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <h3 className="font-semibold text-slate-900 mb-1">{decision.title}</h3>
                          <p className="text-sm text-slate-600 line-clamp-2">
                            {decision.short_summary}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline">{decision.decision_status}</Badge>
                            <span className="text-xs text-slate-500">
                              {decision.total_responses || 0} responses
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="petitions" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Petitions Targeting This Institution</CardTitle>
              </CardHeader>
              <CardContent>
                {petitions.length === 0 ? (
                  <p className="text-slate-600 text-center py-8">No petitions found</p>
                ) : (
                  <div className="space-y-3">
                    {petitions.slice(0, 10).map((petition) => (
                      <Card
                        key={petition.id}
                        className="border hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() =>
                          navigate(createPageUrl("PetitionDetail") + `?id=${petition.id}`)
                        }
                      >
                        <CardContent className="p-4">
                          <h3 className="font-semibold text-slate-900 mb-1">{petition.title}</h3>
                          <p className="text-sm text-slate-600">
                            {petition.signature_count_total?.toLocaleString()} signatures
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trust" className="mt-6">
            {trustScore ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Trust Score Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { label: "Transparency", score: trustScore.transparency_score },
                    { label: "Responsiveness", score: trustScore.responsiveness_score },
                    { label: "Ethical Behaviour", score: trustScore.ethical_behaviour_score },
                    { label: "Environmental", score: trustScore.environmental_score },
                    { label: "Human Impact", score: trustScore.human_impact_score },
                    { label: "Consistency", score: trustScore.consistency_score },
                  ].map(({ label, score }) => (
                    <div key={label}>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium text-slate-700">{label}</span>
                        <span className="text-sm font-semibold">{Math.round(score)}/100</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${score}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-slate-600">
                  Trust score not yet calculated
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="about" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>About</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-slate max-w-none">
                <p className="text-slate-700">
                  {institution?.short_bio || "No description available"}
                </p>
                {institution?.legal_name && institution.legal_name !== institution.name && (
                  <div className="mt-4">
                    <strong>Legal Name:</strong> {institution.legal_name}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}