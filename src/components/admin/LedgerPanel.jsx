import React, { useState } from "react";
import { api } from '@/api/client';
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Lock, CheckCircle2, AlertTriangle, RefreshCw,
  FileText, Hash, Clock, Shield, Plus
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

const STATUS_CONFIG = {
  verified: { color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2, label: "Verified" },
  unverified: { color: "bg-slate-50 text-slate-600 border-slate-200", icon: Clock, label: "Unverified" },
  modified: { color: "bg-red-50 text-red-700 border-red-200", icon: AlertTriangle, label: "Modified!" },
  pending: { color: "bg-amber-50 text-amber-700 border-amber-200", icon: Clock, label: "Pending" },
};

export default function LedgerPanel({ adminUser }) {
  const qc = useQueryClient();
  const [bulkLoading, setBulkLoading] = useState(false);

  const { data: entries = [], isLoading, refetch } = useQuery({
    queryKey: ["ledgerEntries"],
    queryFn: () => api.entities.LedgerEntry.list("-created_date", 50),
    enabled: !!adminUser,
  });

  const runBulkAdd = async () => {
    setBulkLoading(true);
    try {
      const res = await api.functions.invoke("verificationLedger", { action: "bulk_add" });
      toast.success(`Added ${res.data?.added || 0} new ledger entries`);
      qc.invalidateQueries(["ledgerEntries"]);
    } catch (e) {
      toast.error("Ledger update failed: " + e.message);
    } finally {
      setBulkLoading(false);
    }
  };

  const verifiedCount = entries.filter(e => e.verification_status === "verified").length;
  const modifiedCount = entries.filter(e => e.verification_status === "modified").length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-emerald-200 bg-emerald-50/30 text-center">
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold text-emerald-700">{verifiedCount}</div>
            <div className="text-xs text-slate-500">Verified Records</div>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/30 text-center">
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold text-red-600">{modifiedCount}</div>
            <div className="text-xs text-slate-500">Modified / Flagged</div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50/30 text-center">
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold text-blue-700">{entries.length}</div>
            <div className="text-xs text-slate-500">Total Entries</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-3">
        <Button onClick={runBulkAdd} disabled={bulkLoading} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className={`w-4 h-4 mr-2 ${bulkLoading ? "animate-spin" : ""}`} />
          {bulkLoading ? "Adding to Ledger..." : "Add Active Records to Ledger"}
        </Button>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-2" />Refresh
        </Button>
      </div>

      {/* Ledger entries */}
      <Card className="border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-600" />Verification Ledger
          </CardTitle>
          <p className="text-xs text-slate-500">Tamper-resistant hash record of important platform events</p>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
          ) : entries.length === 0 ? (
            <div className="text-center py-8">
              <Lock className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-500">No ledger entries yet</p>
              <p className="text-sm text-slate-400 mt-1">Click "Add Active Records" to populate the ledger</p>
            </div>
          ) : (
            <div className="space-y-2">
              {entries.map(entry => {
                const cfg = STATUS_CONFIG[entry.verification_status] || STATUS_CONFIG.pending;
                const Icon = cfg.icon;
                return (
                  <div key={entry.id} className={`border rounded-xl p-3 ${entry.verification_status === "modified" ? "border-red-200 bg-red-50/20" : "border-slate-100"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                          <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${entry.verification_status === "verified" ? "text-emerald-500" : entry.verification_status === "modified" ? "text-red-500" : "text-amber-500"}`} />
                          <span className="font-medium text-xs text-slate-800 line-clamp-1">{entry.record_title || entry.record_id}</span>
                          <Badge className={`${cfg.color} text-[10px]`}>{cfg.label}</Badge>
                          <Badge variant="outline" className="text-[10px] capitalize">{entry.record_type?.replace(/_/g, " ")}</Badge>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-slate-400">
                          <span className="font-mono truncate max-w-[140px]">{entry.record_hash?.slice(0, 16)}...</span>
                          <span>{entry.source_node || "local"}</span>
                          {entry.verified_at && <span>{formatDistanceToNow(new Date(entry.verified_at), { addSuffix: true })}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info */}
      <Card className="border-slate-200 bg-slate-50">
        <CardContent className="pt-4 pb-4 text-xs text-slate-600 space-y-1">
          <p className="font-semibold">About the Verification Ledger</p>
          <p>Each record generates a SHA-256 hash of its public data. If any field changes, the verification status changes to "Modified". Private data (emails, IPs, payments) is never stored.</p>
          <p>Hashes are chained — each entry contains the previous entry's hash, making retroactive tampering detectable.</p>
        </CardContent>
      </Card>
    </div>
  );
}