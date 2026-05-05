import React, { useState } from "react";
import { api } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Key, Plus, X, Copy, CheckCircle2, Shield, Activity,
  BarChart3, Globe2, TrendingUp, FileText, Eye, EyeOff
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

const ALL_PERMISSIONS = [
  { id: "read_petitions", label: "Read Petitions" },
  { id: "read_votes", label: "Read Votes" },
  { id: "read_scorecards", label: "Read Scorecards" },
  { id: "read_consensus", label: "Read Consensus" },
  { id: "read_statistics", label: "Read Statistics" },
  { id: "read_influence", label: "Read Influence Index" },
  { id: "read_trending", label: "Read Trending" },
  { id: "read_timeline", label: "Read Timeline" },
];

function generateApiKey() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let key = "vta_";
  for (let i = 0; i < 40; i++) key += chars[Math.floor(Math.random() * chars.length)];
  return key;
}

function CreateKeyModal({ onClose, onSave }) {
  const [form, setForm] = useState({ key_name: "", permissions: ["read_petitions", "read_votes", "read_statistics"], notes: "" });
  const [generated, setGenerated] = useState("");

  const togglePerm = (perm) => {
    setForm(f => ({
      ...f,
      permissions: f.permissions.includes(perm) ? f.permissions.filter(p => p !== perm) : [...f.permissions, perm],
    }));
  };

  const handleSave = () => {
    const key = generateApiKey();
    setGenerated(key);
    onSave({ ...form, api_key: key, key_prefix: key.slice(0, 12), status: "active" });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        {!generated ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Create API Key</h3>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Key Name *</label>
                <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                  placeholder="e.g. My Mobile App" value={form.key_name} onChange={e => setForm(f => ({ ...f, key_name: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-2">Permissions</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {ALL_PERMISSIONS.map(p => (
                    <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.permissions.includes(p.id)} onChange={() => togglePerm(p.id)} className="rounded" />
                      <span className="text-xs text-slate-700">{p.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Notes</label>
                <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                  placeholder="What is this key used for?" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
              <Button onClick={handleSave} disabled={!form.key_name} className="flex-1 bg-blue-600 hover:bg-blue-700">Create Key</Button>
            </div>
          </>
        ) : (
          <div className="text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-900 mb-2">API Key Created</h3>
            <p className="text-sm text-slate-600 mb-3">Copy this key now — it won't be shown again.</p>
            <div className="bg-slate-900 text-emerald-400 rounded-lg p-3 font-mono text-xs break-all mb-3">{generated}</div>
            <Button onClick={() => { navigator.clipboard.writeText(generated); toast.success("Copied!"); }} variant="outline" className="w-full mb-2">
              <Copy className="w-3 h-3 mr-2" />Copy Key
            </Button>
            <Button onClick={onClose} className="w-full">Done</Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ApiDashboard({ adminUser }) {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [showFullKey, setShowFullKey] = useState({});

  const { data: keys = [], isLoading } = useQuery({
    queryKey: ["apiKeys"],
    queryFn: () => api.entities.ApiKey.list("-created_date", 50),
    enabled: !!adminUser,
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.entities.ApiKey.create({ ...data, owner_user_id: adminUser?.id }),
    onSuccess: () => { qc.invalidateQueries(["apiKeys"]); setShowCreate(false); toast.success("API key created"); },
  });

  const revokeMutation = useMutation({
    mutationFn: (key) => api.entities.ApiKey.update(key.id, { status: key.status === "active" ? "revoked" : "active" }),
    onSuccess: () => { qc.invalidateQueries(["apiKeys"]); toast.success("Key status updated"); },
  });

  const deleteMutation = useMutation({
    mutationFn: (key) => api.entities.ApiKey.delete(key.id),
    onSuccess: () => { qc.invalidateQueries(["apiKeys"]); toast.success("Key deleted"); },
  });

  const activeKeys = keys.filter(k => k.status === "active");
  const totalRequests = keys.reduce((s, k) => s + (k.total_requests || 0), 0);

  // Build example embed code
  const exampleKey = activeKeys[0]?.key_prefix ? activeKeys[0].key_prefix + "..." : "YOUR_API_KEY";

  return (
    <div className="space-y-6">
      {showCreate && <CreateKeyModal onClose={() => setShowCreate(false)} onSave={d => createMutation.mutate(d)} />}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-blue-200 bg-blue-50/30">
          <CardContent className="pt-4 pb-4 text-center">
            <div className="text-2xl font-bold text-blue-700">{activeKeys.length}</div>
            <div className="text-xs text-slate-500">Active Keys</div>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50/30">
          <CardContent className="pt-4 pb-4 text-center">
            <div className="text-2xl font-bold text-emerald-700">{totalRequests.toLocaleString()}</div>
            <div className="text-xs text-slate-500">Total Requests</div>
          </CardContent>
        </Card>
        <Card className="border-purple-200 bg-purple-50/30">
          <CardContent className="pt-4 pb-4 text-center">
            <div className="text-2xl font-bold text-purple-700">{keys.filter(k => k.status === "revoked").length}</div>
            <div className="text-xs text-slate-500">Revoked Keys</div>
          </CardContent>
        </Card>
      </div>

      {/* Create button */}
      <Button onClick={() => setShowCreate(true)} className="bg-blue-600 hover:bg-blue-700">
        <Plus className="w-4 h-4 mr-2" />Create API Key
      </Button>

      {/* Keys list */}
      <Card className="border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><Key className="w-4 h-4 text-blue-500" />API Keys</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
          ) : keys.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">No API keys yet</p>
          ) : (
            <div className="space-y-3">
              {keys.map(k => (
                <div key={k.id} className={`border rounded-xl p-4 ${k.status === "active" ? "border-slate-200" : "border-slate-200 opacity-60 bg-slate-50"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold text-sm text-slate-800">{k.key_name}</span>
                        <Badge className={k.status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]" : "bg-red-50 text-red-700 border-red-200 text-[10px]"}>
                          {k.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <code className="text-xs font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                          {showFullKey[k.id] ? (k.api_key || k.key_prefix) : (k.key_prefix || "vta_") + "••••••••••••••••••••"}
                        </code>
                        <button onClick={() => setShowFullKey(s => ({ ...s, [k.id]: !s[k.id] }))} className="text-slate-400 hover:text-slate-600">
                          {showFullKey[k.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={() => { navigator.clipboard.writeText(k.api_key || k.key_prefix || ""); toast.success("Copied"); }} className="text-slate-400 hover:text-slate-600">
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {(k.permissions || []).map(p => (
                          <Badge key={p} variant="outline" className="text-[10px]">{p.replace("read_", "")}</Badge>
                        ))}
                      </div>
                      <div className="flex gap-3 text-[10px] text-slate-400 mt-1.5">
                        <span>{(k.total_requests || 0).toLocaleString()} requests</span>
                        {k.last_used_at && <span>Last used {formatDistanceToNow(new Date(k.last_used_at), { addSuffix: true })}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <Button size="sm" variant="outline" className="h-7 text-xs"
                        onClick={() => revokeMutation.mutate(k)}>
                        {k.status === "active" ? "Revoke" : "Restore"}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => deleteMutation.mutate(k)}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage guide */}
      <Card className="border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><FileText className="w-4 h-4 text-slate-500" />API Usage Guide</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <p className="text-xs text-slate-600">Call the <code className="bg-slate-100 px-1 py-0.5 rounded">platformApi</code> backend function with your API key and desired endpoint.</p>
          <div className="bg-slate-900 text-green-400 rounded-lg p-3 text-xs font-mono overflow-x-auto">
{`// Available endpoints: petitions, polls, scorecards, statistics, trending

fetch('/api/functions/platformApi', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    api_key: "${exampleKey}",
    endpoint: "statistics",
    params: { limit: 20 }
  })
})`}
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            {[
              { endpoint: "petitions", perm: "read_petitions", desc: "Active petitions list" },
              { endpoint: "polls", perm: "read_votes", desc: "Open polls & vote counts" },
              { endpoint: "scorecards", perm: "read_scorecards", desc: "Scorecard ratings" },
              { endpoint: "statistics", perm: "read_statistics", desc: "Platform-wide stats" },
              { endpoint: "trending", perm: "read_trending", desc: "Trending content" },
            ].map(e => (
              <div key={e.endpoint} className="bg-slate-50 rounded-lg p-2">
                <code className="text-xs font-mono text-blue-700">{e.endpoint}</code>
                <span className="text-xs text-slate-500 ml-2">— {e.desc}</span>
                <Badge variant="outline" className="text-[10px] ml-1.5">{e.perm}</Badge>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-slate-400">Rate limits: 60 req/min (default). Private data (emails, IPs, payments) is never exposed.</p>
        </CardContent>
      </Card>
    </div>
  );
}