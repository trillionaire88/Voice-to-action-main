import React, { useMemo } from "react";
import { api } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Shield, AlertTriangle, CheckCircle2, XCircle, BarChart3,
  Globe2, Clock, Users, Bot, Copy, Flag, Pause
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const TRUST_COLORS = {
  high: "bg-emerald-100 text-emerald-800 border-emerald-200",
  normal: "bg-blue-100 text-blue-800 border-blue-200",
  low: "bg-amber-100 text-amber-800 border-amber-200",
  suspicious: "bg-red-100 text-red-800 border-red-200",
};

export default function SignatureIntegrityPanel({ petition, adminUser }) {
  const queryClient = useQueryClient();

  const { data: signatures = [], isLoading } = useQuery({
    queryKey: ["signatures", petition.id],
    queryFn: () => api.entities.PetitionSignature.filter({ petition_id: petition.id }),
  });

  const stats = useMemo(() => {
    const valid = signatures.filter(s => !s.is_invalidated && !s.has_withdrawn);
    const confirmed = valid.filter(s => s.is_email_confirmed);
    const bots = valid.filter(s => s.is_bot_suspect);
    const duplicates = valid.filter(s => s.is_duplicate_suspect);
    const suspicious = valid.filter(s => s.trust_level === "suspicious");
    const highTrust = valid.filter(s => s.trust_level === "high");

    // Geographic distribution
    const geoMap = {};
    valid.forEach(s => { geoMap[s.country_code] = (geoMap[s.country_code] || 0) + 1; });
    const geoSorted = Object.entries(geoMap).sort((a, b) => b[1] - a[1]).slice(0, 10);

    // Timeline — signatures per day for last 14 days
    const timeline = {};
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now - i * 86400000);
      const key = format(d, "MMM d");
      timeline[key] = 0;
    }
    valid.forEach(s => {
      const key = format(new Date(s.created_date), "MMM d");
      if (key in timeline) timeline[key]++;
    });

    // Detect spike (>3x average)
    const counts = Object.values(timeline);
    const avg = counts.reduce((a, b) => a + b, 0) / counts.length || 1;
    const maxCount = Math.max(...counts);
    const hasSpikeAlert = maxCount > avg * 3 && maxCount > 5;

    return { valid, confirmed, bots, duplicates, suspicious, highTrust, geoSorted, timeline, hasSpikeAlert, avg, maxCount };
  }, [signatures]);

  const invalidateMutation = useMutation({
    mutationFn: async ({ sigId, reason }) => {
      await api.entities.PetitionSignature.update(sigId, {
        is_invalidated: true,
        invalidated_by: adminUser.id,
        invalidated_at: new Date().toISOString(),
        invalidation_reason: reason,
      });
      await api.entities.Petition.update(petition.id, {
        signature_count_total: Math.max(0, (petition.signature_count_total || 0) - 1),
      });
    },
    onSuccess: () => { queryClient.invalidateQueries(["signatures", petition.id]); toast.success("Signature invalidated."); },
    onError: () => toast.error("Failed to invalidate signature."),
  });

  const pauseMutation = useMutation({
    mutationFn: () => api.entities.Petition.update(petition.id, { status: "archived" }),
    onSuccess: () => { queryClient.invalidateQueries(["petition", petition.id]); toast.success("Petition paused."); },
  });

  const invalidateAll = async (list, reason) => {
    for (const s of list) {
      await invalidateMutation.mutateAsync({ sigId: s.id, reason });
    }
  };

  if (isLoading) return <div className="text-sm text-slate-500 p-4">Loading signature data...</div>;

  return (
    <div className="space-y-6">
      {/* Alert banner */}
      {(stats.hasSpikeAlert || stats.bots.length > 0 || stats.duplicates.length > 0) && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
          <div className="space-y-1 text-sm">
            {stats.hasSpikeAlert && <p className="text-red-800 font-semibold">📈 Unusual signing spike detected: {stats.maxCount} signatures in one day vs average of {stats.avg.toFixed(1)}</p>}
            {stats.bots.length > 0 && <p className="text-red-700">{stats.bots.length} signatures flagged as potential bot activity</p>}
            {stats.duplicates.length > 0 && <p className="text-red-700">{stats.duplicates.length} duplicate device signatures detected</p>}
          </div>
        </div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Valid", value: stats.valid.length, icon: Users, color: "text-blue-700" },
          { label: "Email Confirmed", value: stats.confirmed.length, icon: CheckCircle2, color: "text-emerald-700" },
          { label: "Bot Suspects", value: stats.bots.length, icon: Bot, color: "text-red-700" },
          { label: "Duplicates", value: stats.duplicates.length, icon: Copy, color: "text-orange-700" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-3 flex items-center gap-3">
              <s.icon className={`w-5 h-5 ${s.color}`} />
              <div>
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-slate-500">{s.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Trust distribution */}
      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Shield className="w-4 h-4" />Trust Score Distribution</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {["high","normal","low","suspicious"].map(level => {
            const count = stats.valid.filter(s => s.trust_level === level).length;
            const pct = stats.valid.length ? Math.round((count / stats.valid.length) * 100) : 0;
            return (
              <div key={level} className="flex items-center gap-3">
                <Badge className={`w-24 justify-center border ${TRUST_COLORS[level]}`}>{level}</Badge>
                <div className="flex-1">
                  <Progress value={pct} className="h-2" />
                </div>
                <span className="text-xs font-semibold w-12 text-right">{count} ({pct}%)</span>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Geographic distribution */}
      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Globe2 className="w-4 h-4" />Geographic Distribution</CardTitle></CardHeader>
        <CardContent>
          {stats.geoSorted.length === 0 ? (
            <p className="text-sm text-slate-500">No data yet.</p>
          ) : (
            <div className="space-y-2">
              {stats.geoSorted.map(([country, count]) => {
                const pct = stats.valid.length ? Math.round((count / stats.valid.length) * 100) : 0;
                return (
                  <div key={country} className="flex items-center gap-3">
                    <span className="text-sm font-mono w-10 text-slate-700">{country}</span>
                    <div className="flex-1">
                      <Progress value={pct} className="h-2" />
                    </div>
                    <span className="text-xs text-slate-500 w-20 text-right">{count} ({pct}%)</span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Signature timeline */}
      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="w-4 h-4" />Signing Activity (Last 14 Days)</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-end gap-1 h-24">
            {Object.entries(stats.timeline).map(([day, count]) => {
              const maxVal = Math.max(...Object.values(stats.timeline), 1);
              const height = Math.max((count / maxVal) * 100, count > 0 ? 8 : 2);
              const isSpike = count > stats.avg * 3 && count > 3;
              return (
                <div key={day} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className={`w-full rounded-t transition-all ${isSpike ? "bg-red-400" : "bg-blue-400"}`}
                    style={{ height: `${height}%` }}
                    title={`${day}: ${count} signatures`}
                  />
                  <span className="text-[9px] text-slate-400 rotate-45 origin-left">{day.split(" ")[1]}</span>
                </div>
              );
            })}
          </div>
          {stats.hasSpikeAlert && (
            <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />Red bars indicate suspicious activity spikes
            </p>
          )}
        </CardContent>
      </Card>

      {/* Flagged signatures */}
      {(stats.bots.length > 0 || stats.duplicates.length > 0 || stats.suspicious.length > 0) && (
        <Card className="border-red-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2 text-red-700">
                <Flag className="w-4 h-4" />Flagged Signatures — Owner Actions
              </CardTitle>
              <div className="flex gap-2">
                {stats.bots.length > 0 && (
                  <Button size="sm" variant="outline" className="border-red-300 text-red-700 text-xs"
                    onClick={() => invalidateAll(stats.bots, "Bot activity detected")}
                    disabled={invalidateMutation.isPending}>
                    Remove All Bots ({stats.bots.length})
                  </Button>
                )}
                {stats.duplicates.length > 0 && (
                  <Button size="sm" variant="outline" className="border-orange-300 text-orange-700 text-xs"
                    onClick={() => invalidateAll(stats.duplicates, "Duplicate device fingerprint")}
                    disabled={invalidateMutation.isPending}>
                    Remove Duplicates ({stats.duplicates.length})
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {[...stats.bots, ...stats.duplicates, ...stats.suspicious.filter(s => !s.is_bot_suspect && !s.is_duplicate_suspect)]
                .slice(0, 30)
                .map(sig => (
                <div key={sig.id} className="flex items-center justify-between gap-3 text-xs py-2 border-b border-slate-100 last:border-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-slate-700 truncate">{sig.signer_name}</span>
                      <Badge className={`border ${TRUST_COLORS[sig.trust_level]} text-xs`}>{sig.trust_level}</Badge>
                      {sig.is_bot_suspect && <Badge className="bg-red-100 text-red-700 border-red-200">bot</Badge>}
                      {sig.is_duplicate_suspect && <Badge className="bg-orange-100 text-orange-700 border-orange-200">duplicate</Badge>}
                    </div>
                    <div className="text-slate-400 mt-0.5 truncate">
                      {sig.country_code} • {format(new Date(sig.created_date), "MMM d HH:mm")}
                      {sig.bot_flag_reason && <span className="ml-1">• {sig.bot_flag_reason}</span>}
                      {sig.duplicate_flag_reason && <span className="ml-1">• {sig.duplicate_flag_reason}</span>}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-200 text-red-600 text-xs shrink-0"
                    onClick={() => invalidateMutation.mutate({ sigId: sig.id, reason: "Removed by moderator" })}
                    disabled={invalidateMutation.isPending}
                  >
                    <XCircle className="w-3 h-3 mr-1" />Remove
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pause petition */}
      {petition.status === "active" && (stats.hasSpikeAlert || stats.bots.length >= 5) && (
        <Card className="border-amber-200 bg-amber-50/30">
          <CardContent className="pt-4 pb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-amber-800">Suspicious activity detected</p>
              <p className="text-xs text-amber-600 mt-0.5">You can temporarily pause this petition to stop new signatures while you investigate.</p>
            </div>
            <Button
              variant="outline"
              className="border-amber-300 text-amber-700 shrink-0"
              onClick={() => pauseMutation.mutate()}
              disabled={pauseMutation.isPending}
            >
              <Pause className="w-4 h-4 mr-1" />Pause Petition
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}