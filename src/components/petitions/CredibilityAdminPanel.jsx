import React, { useState } from "react";
import { api } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Shield, AlertTriangle, RefreshCw, Globe, Users, CheckCircle2,
  Copy, TrendingUp, Activity, ShieldX
} from "lucide-react";
import { format } from "date-fns";

function computeCredibility(petition, signatures, comments) {
  const total = signatures.length;
  if (total === 0) {
    return {
      auth_score: 0, trust_score: 0, engagement_score: 0, growth_score: 0, geo_score: 0,
      penalty_applied: 0, penalty_reasons: [], suspicious_alerts: [],
      overall_score: 0, badge: "moderate",
      verified_sigs: 0, email_confirmed_sigs: 0, duplicate_count: 0,
      bot_suspect_count: 0, invalidated_count: 0, country_count: 0, comment_count: comments.length,
    };
  }

  const verified = signatures.filter(s => s.is_verified_user).length;
  const emailConfirmed = signatures.filter(s => s.is_email_confirmed).length;
  const duplicates = signatures.filter(s => s.is_duplicate_suspect).length;
  const bots = signatures.filter(s => s.is_bot_suspect).length;
  const invalidated = signatures.filter(s => s.is_invalidated).length;
  const countries = [...new Set(signatures.map(s => s.country_code).filter(Boolean))].length;

  // -- AUTH SCORE (max 100, weighted 30%)
  const verifiedRate = verified / total;
  const emailRate = emailConfirmed / total;
  const cleanRate = 1 - (duplicates + bots + invalidated) / total;
  const auth_score = Math.round(((verifiedRate * 0.5) + (emailRate * 0.3) + (cleanRate * 0.2)) * 100);

  // -- TRUST SCORE (max 100, weighted 20%)
  const highTrust = signatures.filter(s => s.trust_level === "high").length;
  const lowTrust = signatures.filter(s => s.trust_level === "low" || s.trust_level === "suspicious").length;
  const trust_score = Math.round(Math.max(0, ((highTrust * 1.5) - (lowTrust * 1)) / total * 100));

  // -- ENGAGEMENT SCORE (max 100, weighted 20%)
  const commentRate = Math.min(comments.length / Math.max(total * 0.01, 1), 1);
  const engagement_score = Math.round(commentRate * 100);

  // -- GROWTH SCORE (max 100, weighted 15%)
  const now = new Date();
  const sigs24h = signatures.filter(s => (now - new Date(s.created_date)) < 86400000).length;
  const sigs7d = signatures.filter(s => (now - new Date(s.created_date)) < 604800000).length;
  const sigs30d = signatures.filter(s => (now - new Date(s.created_date)) < 2592000000).length;
  // Organic distribution check — penalise if 80%+ came in under 1 hour
  const sigs1h = signatures.filter(s => (now - new Date(s.created_date)) < 3600000).length;
  const burstRatio = total > 10 ? sigs1h / total : 0;
  const growth_score = Math.round(Math.max(0, 80 - (burstRatio * 100)) + Math.min(20, (sigs7d / Math.max(total, 1)) * 20));

  // -- GEO SCORE (max 100, weighted 15%)
  const geo_score = Math.min(countries * 8, 100);

  // -- PENALTIES
  const penalty_reasons = [];
  let penalty = 0;

  if (bots > 0) {
    const p = Math.min(Math.round((bots / total) * 30), 30);
    penalty += p;
    penalty_reasons.push(`Bot activity detected (${bots} flagged, -${p} pts)`);
  }
  if (duplicates > 0) {
    const p = Math.min(Math.round((duplicates / total) * 20), 20);
    penalty += p;
    penalty_reasons.push(`Duplicate signatures (${duplicates} found, -${p} pts)`);
  }
  if (burstRatio > 0.5 && total > 20) {
    penalty += 15;
    penalty_reasons.push(`Abnormal signing burst (${Math.round(burstRatio * 100)}% within 1hr, -15 pts)`);
  }

  // -- SUSPICIOUS ALERTS (admin only)
  const suspicious_alerts = [];
  if (bots > 5) suspicious_alerts.push(`⚠️ ${bots} signatures flagged as bot activity`);
  if (duplicates > 3) suspicious_alerts.push(`⚠️ ${duplicates} duplicate signatures detected`);
  if (burstRatio > 0.7 && total > 10) suspicious_alerts.push(`⚠️ Rapid burst: ${sigs1h} signatures in 1 hour (${Math.round(burstRatio * 100)}% of total)`);
  const topCountrySigs = Math.max(...Object.values(
    signatures.reduce((acc, s) => { acc[s.country_code] = (acc[s.country_code] || 0) + 1; return acc; }, {})
  ));
  if (topCountrySigs / total > 0.9 && total > 20) suspicious_alerts.push(`⚠️ 90%+ signatures from a single country — geographic clustering`);

  // -- WEIGHTED FINAL
  const raw = (auth_score * 0.30) + (trust_score * 0.20) + (engagement_score * 0.20) + (growth_score * 0.15) + (geo_score * 0.15);
  const overall_score = Math.max(0, Math.min(100, Math.round(raw - penalty)));

  const badge = overall_score >= 80 ? "highly_credible"
    : overall_score >= 60 ? "credible"
    : overall_score >= 40 ? "moderate"
    : overall_score >= 20 ? "low"
    : "suspicious";

  return {
    auth_score, trust_score, engagement_score, growth_score, geo_score,
    penalty_applied: penalty, penalty_reasons, suspicious_alerts,
    overall_score, badge,
    verified_sigs: verified, email_confirmed_sigs: emailConfirmed,
    duplicate_count: duplicates, bot_suspect_count: bots, invalidated_count: invalidated,
    country_count: countries, comment_count: comments.length,
    total_sigs: total,
  };
}

export { computeCredibility };

export default function CredibilityAdminPanel({ petitionId, petition }) {
  const queryClient = useQueryClient();

  const { data: credibility } = useQuery({
    queryKey: ["credibility", petitionId],
    queryFn: async () => {
      const results = await api.entities.CredibilityScore.filter({ petition_id: petitionId });
      return results[0] || null;
    },
    enabled: !!petitionId,
  });

  const calcMutation = useMutation({
    mutationFn: async () => {
      const [signatures, comments] = await Promise.all([
        api.entities.PetitionSignature.filter({ petition_id: petitionId }),
        api.entities.Comment.filter({ poll_id: petitionId }),
      ]);
      const result = computeCredibility(petition, signatures, comments);
      const payload = {
        petition_id: petitionId,
        petition_title: petition.title,
        ...result,
        last_calculated_at: new Date().toISOString(),
      };
      if (credibility) {
        await api.entities.CredibilityScore.update(credibility.id, payload);
      } else {
        await api.entities.CredibilityScore.create(payload);
      }
    },
    onSuccess: () => queryClient.invalidateQueries(["credibility", petitionId]),
  });

  const SCORE_LABEL = {
    highly_credible: "Highly Credible",
    credible: "Credible",
    moderate: "Moderate Credibility",
    low: "Low Credibility",
    suspicious: "Suspicious Activity",
  };

  const badgeColor = {
    highly_credible: "bg-emerald-100 text-emerald-800",
    credible: "bg-blue-100 text-blue-800",
    moderate: "bg-amber-100 text-amber-800",
    low: "bg-orange-100 text-orange-800",
    suspicious: "bg-red-100 text-red-800",
  };

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-600" />
            Credibility Analysis (Admin)
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => calcMutation.mutate()} disabled={calcMutation.isPending}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${calcMutation.isPending ? "animate-spin" : ""}`} />
            {credibility ? "Recalculate" : "Calculate"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {!credibility ? (
          <p className="text-slate-500 text-xs">No score calculated yet. Click Calculate to analyse.</p>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div className="text-4xl font-extrabold text-slate-900">{Math.round(credibility.overall_score)}</div>
              <div>
                <Badge className={badgeColor[credibility.badge]}>{SCORE_LABEL[credibility.badge]}</Badge>
                <p className="text-xs text-slate-400 mt-1">
                  Last calculated: {credibility.last_calculated_at ? format(new Date(credibility.last_calculated_at), "MMM d, p") : "—"}
                </p>
              </div>
            </div>

            {/* Sub-scores */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Sig. Authenticity", val: credibility.auth_score, weight: "30%", color: "text-emerald-700" },
                { label: "Account Trust", val: credibility.trust_score, weight: "20%", color: "text-blue-700" },
                { label: "Engagement", val: credibility.engagement_score, weight: "20%", color: "text-purple-700" },
                { label: "Growth Pattern", val: credibility.growth_score, weight: "15%", color: "text-amber-700" },
                { label: "Geo Diversity", val: credibility.geo_score, weight: "15%", color: "text-indigo-700" },
              ].map(({ label, val, weight, color }) => (
                <div key={label} className="bg-slate-50 rounded p-2 border border-slate-100">
                  <div className="text-xs text-slate-400">{label} ({weight})</div>
                  <div className={`text-lg font-bold ${color}`}>{Math.round(val)}</div>
                </div>
              ))}
              <div className="bg-red-50 rounded p-2 border border-red-100">
                <div className="text-xs text-red-400">Penalties</div>
                <div className="text-lg font-bold text-red-700">-{Math.round(credibility.penalty_applied)}</div>
              </div>
            </div>

            <Separator />

            {/* Signature stats */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between"><span className="text-slate-500">Total Signatures</span><span className="font-semibold">{credibility.total_sigs}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Verified Users</span><span className="font-semibold text-emerald-600">{credibility.verified_sigs}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Email Confirmed</span><span className="font-semibold text-blue-600">{credibility.email_confirmed_sigs}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Duplicates Flagged</span><span className="font-semibold text-orange-600">{credibility.duplicate_count}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Bot Suspects</span><span className="font-semibold text-red-600">{credibility.bot_suspect_count}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Invalidated</span><span className="font-semibold text-slate-500">{credibility.invalidated_count}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Countries</span><span className="font-semibold">{credibility.country_count}</span></div>
            </div>

            {/* Penalty reasons */}
            {credibility.penalty_reasons?.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-xs space-y-1">
                <p className="font-semibold text-orange-700">Applied Penalties:</p>
                {credibility.penalty_reasons.map((r, i) => <p key={i} className="text-orange-600">• {r}</p>)}
              </div>
            )}

            {/* Admin-only suspicious alerts */}
            {credibility.suspicious_alerts?.length > 0 && (
              <div className="bg-red-50 border border-red-300 rounded-lg p-3 text-xs space-y-1">
                <p className="font-semibold text-red-700 flex items-center gap-1.5">
                  <ShieldX className="w-3.5 h-3.5" />Suspicious Activity Alerts
                </p>
                {credibility.suspicious_alerts.map((a, i) => <p key={i} className="text-red-600">{a}</p>)}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}