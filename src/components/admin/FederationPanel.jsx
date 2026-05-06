import { useState } from "react";
import { api } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Network, Plus, X, CheckCircle2,
  Globe2, Pause, Play, Trash2
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

const STATUS_CONFIG = {
  pending: { color: "bg-amber-50 text-amber-700 border-amber-200", label: "Pending" },
  active: { color: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Active" },
  paused: { color: "bg-slate-50 text-slate-600 border-slate-200", label: "Paused" },
  suspended: { color: "bg-red-50 text-red-700 border-red-200", label: "Suspended" },
  disconnected: { color: "bg-red-50 text-red-600 border-red-200", label: "Disconnected" },
};

function AddNodeModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    node_name: "", node_url: "", node_api_key: "",
    sync_mode: "read_only", notes: "",
    permissions: ["read_petitions", "read_votes", "read_scorecards"],
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const togglePerm = (p) => setForm(f => ({
    ...f, permissions: f.permissions.includes(p) ? f.permissions.filter(x => x !== p) : [...f.permissions, p],
  }));

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">Register Federation Node</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Node Name *</label>
            <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
              placeholder="e.g. Australia Node" value={form.node_name} onChange={e => set("node_name", e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Node URL *</label>
            <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
              placeholder="https://node.example.com" value={form.node_url} onChange={e => set("node_url", e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Node API Key</label>
            <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
              placeholder="API key for authentication" value={form.node_api_key} onChange={e => set("node_api_key", e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Sync Mode</label>
            <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
              value={form.sync_mode} onChange={e => set("sync_mode", e.target.value)}>
              <option value="read_only">Read Only</option>
              <option value="read_write">Read + Write</option>
              <option value="analytics">Analytics Only</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-2">Permissions</label>
            <div className="grid grid-cols-2 gap-1">
              {["read_petitions", "read_votes", "read_scorecards", "read_consensus", "read_influence", "read_timeline", "sync_data"].map(p => (
                <label key={p} className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={form.permissions.includes(p)} onChange={() => togglePerm(p)} className="rounded" />
                  <span className="text-xs text-slate-700">{p.replace(/_/g, " ")}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={() => onSave({ ...form, status: "pending", node_id: `node_${Date.now()}` })}
            disabled={!form.node_name || !form.node_url} className="flex-1 bg-blue-600 hover:bg-blue-700">
            Register Node
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function FederationPanel({ adminUser }) {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);

  const { data: nodes = [], isLoading } = useQuery({
    queryKey: ["federationNodes"],
    queryFn: () => api.entities.FederationNode.list("-created_date", 50),
    enabled: !!adminUser,
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.entities.FederationNode.create({ ...data, owner_user_id: adminUser?.id }),
    onSuccess: () => { qc.invalidateQueries(["federationNodes"]); setShowAdd(false); toast.success("Node registered"); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.FederationNode.update(id, data),
    onSuccess: () => { qc.invalidateQueries(["federationNodes"]); toast.success("Node updated"); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.entities.FederationNode.delete(id),
    onSuccess: () => { qc.invalidateQueries(["federationNodes"]); toast.success("Node removed"); },
  });

  const activeNodes = nodes.filter(n => n.status === "active");
  const pendingNodes = nodes.filter(n => n.status === "pending");

  return (
    <div className="space-y-6">
      {showAdd && <AddNodeModal onClose={() => setShowAdd(false)} onSave={d => createMutation.mutate(d)} />}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-emerald-200 bg-emerald-50/30 text-center">
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold text-emerald-700">{activeNodes.length}</div>
            <div className="text-xs text-slate-500">Active Nodes</div>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/30 text-center">
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold text-amber-700">{pendingNodes.length}</div>
            <div className="text-xs text-slate-500">Pending</div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50/30 text-center">
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold text-blue-700">{nodes.reduce((s, n) => s + (n.total_synced_records || 0), 0)}</div>
            <div className="text-xs text-slate-500">Synced Records</div>
          </CardContent>
        </Card>
      </div>

      <Button onClick={() => setShowAdd(true)} className="bg-blue-600 hover:bg-blue-700">
        <Plus className="w-4 h-4 mr-2" />Register Node
      </Button>

      {isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      ) : nodes.length === 0 ? (
        <Card className="border-slate-200">
          <CardContent className="pt-8 pb-8 text-center">
            <Network className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No federation nodes registered</p>
            <p className="text-sm text-slate-400 mt-1">Register partner nodes to build a federated network</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {nodes.map(node => {
            const statusCfg = STATUS_CONFIG[node.status] || STATUS_CONFIG.pending;
            return (
              <Card key={node.id} className="border-slate-200">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Globe2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        <span className="font-semibold text-sm text-slate-800">{node.node_name}</span>
                        <Badge className={`${statusCfg.color} text-[10px]`}>{statusCfg.label}</Badge>
                        {node.is_verified && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                        <Badge variant="outline" className="text-[10px]">{node.sync_mode?.replace(/_/g, " ")}</Badge>
                      </div>
                      <p className="text-xs text-slate-500 truncate">{node.node_url}</p>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {(node.permissions || []).map(p => (
                          <Badge key={p} variant="outline" className="text-[10px]">{p.replace("read_", "")}</Badge>
                        ))}
                      </div>
                      <div className="flex gap-3 text-[10px] text-slate-400 mt-1.5">
                        {node.last_sync_at && <span>Synced {formatDistanceToNow(new Date(node.last_sync_at), { addSuffix: true })}</span>}
                        {node.total_synced_records > 0 && <span>{node.total_synced_records} records</span>}
                        {node.sync_errors > 0 && <span className="text-red-400">{node.sync_errors} errors</span>}
                      </div>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0 flex-wrap justify-end">
                      {node.status === "pending" && (
                        <Button size="sm" variant="outline" className="h-7 text-xs border-emerald-200 text-emerald-700"
                          onClick={() => updateMutation.mutate({ id: node.id, data: { status: "active", is_verified: true } })}>
                          Approve
                        </Button>
                      )}
                      {node.status === "active" && (
                        <Button size="sm" variant="outline" className="h-7 text-xs"
                          onClick={() => updateMutation.mutate({ id: node.id, data: { status: "paused" } })}>
                          <Pause className="w-3 h-3 mr-1" />Pause
                        </Button>
                      )}
                      {node.status === "paused" && (
                        <Button size="sm" variant="outline" className="h-7 text-xs border-emerald-200 text-emerald-700"
                          onClick={() => updateMutation.mutate({ id: node.id, data: { status: "active" } })}>
                          <Play className="w-3 h-3 mr-1" />Resume
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="h-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => deleteMutation.mutate(node.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Info note */}
      <Card className="border-blue-200 bg-blue-50/20">
        <CardContent className="pt-4 pb-4 text-sm text-blue-800 space-y-1">
          <p className="font-semibold">About Federation</p>
          <p className="text-xs">Each node operates independently and can continue without network access. Only public data is shared — private user data, emails, and payment information are never federated.</p>
        </CardContent>
      </Card>
    </div>
  );
}