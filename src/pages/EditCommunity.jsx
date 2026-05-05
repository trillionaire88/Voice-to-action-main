import React, { useState, useEffect } from "react";
import { api } from '@/api/client';
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, Save, Trash2, Users, Shield, Settings,
  RefreshCw, AlertTriangle, CheckCircle2, UserPlus, UserMinus, Lock
} from "lucide-react";
import { toast } from "sonner";
import { sanitiseText } from "@/lib/sanitise";

export default function EditCommunity() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const communityId = new URLSearchParams(window.location.search).get("id");

  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("edit");
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [addingAdmin, setAddingAdmin] = useState(false);

  // Edit form state
  const [form, setForm] = useState({
    community_name: "",
    community_description: "",
    community_type: "",
    community_visibility: "public",
    community_location: "",
    community_category: "",
    community_tags: "",
    private_code: "",
    community_logo: "",
    community_banner: "",
  });

  useEffect(() => {
    api.auth.me().then(setUser).catch(() => navigate("/Communities"));
  }, []);

  const { data: community, isLoading } = useQuery({
    queryKey: ["community", communityId],
    queryFn: () => api.entities.Community.filter({ id: communityId }).then(r => r[0]),
    enabled: !!communityId,
    onSuccess: (c) => {
      if (!c) return;
      setForm({
        community_name: c.community_name || c.name || "",
        community_description: c.community_description || c.description_public || "",
        community_type: c.community_type || "",
        community_visibility: c.community_visibility || c.visibility || "public",
        community_location: c.community_location || "",
        community_category: c.community_category || "",
        community_tags: (c.community_tags || c.tags || []).join(", "),
        private_code: c.private_code || "",
        community_logo: c.community_logo || c.logo_url || "",
        community_banner: c.community_banner || c.banner_url || "",
      });
    },
  });

  // Fill form when community loads
  useEffect(() => {
    if (!community) return;
    setForm({
      community_name: community.community_name || community.name || "",
      community_description: community.community_description || community.description_public || "",
      community_type: community.community_type || "",
      community_visibility: community.community_visibility || community.visibility || "public",
      community_location: community.community_location || "",
      community_category: community.community_category || "",
      community_tags: (community.community_tags || community.tags || []).join(", "),
      private_code: community.private_code || "",
      community_logo: community.community_logo || community.logo_url || "",
      community_banner: community.community_banner || community.banner_url || "",
    });
  }, [community]);

  const { data: members = [] } = useQuery({
    queryKey: ["communityMembers", communityId],
    queryFn: () => api.entities.CommunityMember.filter({ community_id: communityId }),
    enabled: !!communityId,
  });

  const isPlatformAdmin = user?.role === "admin" || user?.role === "owner_admin";
  const isOwner = community && (community.community_owner === user?.id || community.founder_user_id === user?.id);
  const canAccess = isOwner || isPlatformAdmin;

  const saveMutation = useMutation({
    mutationFn: () => {
      const tags = form.community_tags.split(",").map(t => sanitiseText(t.trim(), 80)).filter(Boolean);
      const safeName = sanitiseText(form.community_name, 200);
      const safeDesc = sanitiseText(form.community_description, 10000);
      return api.entities.Community.update(communityId, {
        community_name: safeName,
        community_description: safeDesc,
        community_type: form.community_type,
        community_visibility: form.community_visibility,
        community_location: sanitiseText(form.community_location, 500),
        community_category: sanitiseText(form.community_category, 200),
        community_tags: tags,
        private_code: form.private_code,
        community_logo: sanitiseText(form.community_logo || "", 2000),
        community_banner: sanitiseText(form.community_banner || "", 2000),
        // Keep legacy fields in sync
        name: safeName,
        description_public: safeDesc,
        visibility: form.community_visibility,
        tags,
        logo_url: form.community_logo,
        banner_url: form.community_banner,
      });
    },
    onSuccess: () => {
      toast.success("Community updated!");
      queryClient.invalidateQueries(["community", communityId]);
    },
    onError: (e) => toast.error("Save failed: " + e.message),
  });

  const regenerateCode = () => {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    setForm(f => ({ ...f, private_code: code }));
    toast.success("New code generated — save to apply.");
  };

  const handleAddAdmin = async () => {
    if (!newAdminEmail.trim()) return;
    setAddingAdmin(true);
    try {
      const users = await api.entities.User.filter({ email: newAdminEmail.trim() });
      const target = users[0];
      if (!target) { toast.error("User not found"); return; }
      if (target.id === community.community_owner) { toast.error("This user is the owner"); return; }
      const admins = community.community_admins || [];
      if (admins.includes(target.id)) { toast.error("Already an admin"); return; }
      await api.entities.Community.update(communityId, { community_admins: [...admins, target.id] });
      queryClient.invalidateQueries(["community", communityId]);
      setNewAdminEmail("");
      toast.success("Admin added!");
    } finally {
      setAddingAdmin(false);
    }
  };

  const handleRemoveAdmin = async (adminId) => {
    const admins = (community.community_admins || []).filter(id => id !== adminId);
    await api.entities.Community.update(communityId, { community_admins: admins });
    queryClient.invalidateQueries(["community", communityId]);
    toast.success("Admin removed");
  };

  const handleDelete = async () => {
    const targetName = community.community_name || community.name || "";
    if (deleteConfirmName !== targetName) {
      toast.error("Community name doesn't match");
      return;
    }
    const isPaid = community.community_plan === "paid" || community.community_plan === "private" || community.community_plan === "premium";
    if (isPaid && community.subscription_active && !isPlatformAdmin) {
      toast.error("Cancel your subscription before deleting a paid community");
      return;
    }
    setDeleting(true);
    try {
      // Remove members
      const mems = await api.entities.CommunityMember.filter({ community_id: communityId });
      await Promise.all(mems.map(m => api.entities.CommunityMember.delete(m.id)));
      // Remove discussions
      const discs = await api.entities.CommunityDiscussion.filter({ community_id: communityId });
      await Promise.all(discs.map(d => api.entities.CommunityDiscussion.delete(d.id)));
      // Delete community
      await api.entities.Community.delete(communityId);
      toast.success("Community deleted");
      navigate("/Communities");
    } catch (e) {
      toast.error("Delete failed: " + e.message);
    } finally {
      setDeleting(false);
    }
  };

  if (isLoading || !community) {
    return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" /></div>;
  }

  if (!canAccess) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <Lock className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Access Denied</h2>
        <p className="text-slate-600 mb-4">Only the community owner can manage this community.</p>
        <Button variant="outline" onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  const communityDisplayName = community.community_name || community.name || "Community";
  const admins = community.community_admins || [];
  const isPaid = community.community_plan === "paid" || community.community_plan === "private" || community.community_plan === "premium";

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 pb-16">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/CommunityDetail?id=${communityId}`)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manage Community</h1>
          <p className="text-sm text-slate-500">{communityDisplayName}</p>
        </div>
        <Badge className="ml-auto capitalize bg-slate-100 text-slate-700">{community.community_plan || "free"}</Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="edit"><Settings className="w-4 h-4 mr-1.5" />Edit</TabsTrigger>
          <TabsTrigger value="admins"><Shield className="w-4 h-4 mr-1.5" />Admins</TabsTrigger>
          <TabsTrigger value="members"><Users className="w-4 h-4 mr-1.5" />Members</TabsTrigger>
          <TabsTrigger value="danger" className="text-red-600"><Trash2 className="w-4 h-4 mr-1.5" />Delete</TabsTrigger>
        </TabsList>

        {/* ── Edit Tab ── */}
        <TabsContent value="edit">
          <Card>
            <CardHeader>
              <CardTitle>Edit Community Details</CardTitle>
              <CardDescription>Update name, description, type, and settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Community Name *</Label>
                <Input className="mt-1" value={form.community_name} onChange={e => setForm(f => ({ ...f, community_name: e.target.value }))} />
              </div>
              <div>
                <Label>Description *</Label>
                <Textarea className="mt-1" rows={3} value={form.community_description} onChange={e => setForm(f => ({ ...f, community_description: e.target.value }))} />
              </div>
              <div>
                <Label>Community Type</Label>
                <Select value={form.community_type} onValueChange={v => setForm(f => ({ ...f, community_type: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["general","business","company","council","government","gym","school","organisation","service","private"].map(t => (
                      <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {community.community_plan !== "private" && (
                <div>
                  <Label>Visibility</Label>
                  <Select value={form.community_visibility} onValueChange={v => setForm(f => ({ ...f, community_visibility: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="invite_only">Invite Only</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label>Location</Label>
                  <Input className="mt-1" value={form.community_location} onChange={e => setForm(f => ({ ...f, community_location: e.target.value }))} placeholder="City, Country" />
                </div>
                <div>
                  <Label>Category</Label>
                  <Input className="mt-1" value={form.community_category} onChange={e => setForm(f => ({ ...f, community_category: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label>Tags (comma-separated)</Label>
                <Input className="mt-1" value={form.community_tags} onChange={e => setForm(f => ({ ...f, community_tags: e.target.value }))} />
              </div>
              <div>
                <Label>Logo URL</Label>
                <Input className="mt-1" value={form.community_logo} onChange={e => setForm(f => ({ ...f, community_logo: e.target.value }))} placeholder="https://..." />
              </div>
              <div>
                <Label>Banner URL</Label>
                <Input className="mt-1" value={form.community_banner} onChange={e => setForm(f => ({ ...f, community_banner: e.target.value }))} placeholder="https://..." />
              </div>

              {/* Private code */}
              <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                <div className="flex items-center justify-between mb-2">
                  <Label>Private Access Code</Label>
                  <Button size="sm" variant="outline" onClick={regenerateCode}>
                    <RefreshCw className="w-3 h-3 mr-1.5" />Regenerate
                  </Button>
                </div>
                <Input value={form.private_code} onChange={e => setForm(f => ({ ...f, private_code: e.target.value }))} placeholder="No code set" />
                <p className="text-xs text-slate-500 mt-1">Share this code with users you want to invite.</p>
              </div>

              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="w-full bg-blue-600 hover:bg-blue-700">
                <Save className="w-4 h-4 mr-2" />
                {saveMutation.isPending ? "Saving…" : "Save Changes"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Admins Tab ── */}
        <TabsContent value="admins">
          <Card>
            <CardHeader>
              <CardTitle>Admin Management</CardTitle>
              <CardDescription>Admins can moderate content but cannot delete the community or remove the owner.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Owner */}
              <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <Shield className="w-5 h-5 text-amber-600" />
                <div>
                  <p className="font-semibold text-slate-900 text-sm">Owner</p>
                  <p className="text-xs text-slate-500">{user?.full_name} — full control</p>
                </div>
                <Badge className="ml-auto bg-amber-100 text-amber-700">Owner</Badge>
              </div>

              {/* Current admins */}
              {admins.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-700">Current Admins ({admins.length})</p>
                  {admins.map(adminId => (
                    <div key={adminId} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-blue-500" />
                        <span className="text-sm text-slate-700 font-mono">{adminId.substring(0, 12)}…</span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => handleRemoveAdmin(adminId)}
                      >
                        <UserMinus className="w-3 h-3 mr-1" />Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add admin */}
              <div className="border-t border-slate-200 pt-4">
                <p className="text-sm font-semibold text-slate-700 mb-2">Add Admin by Email</p>
                <div className="flex gap-2">
                  <Input
                    value={newAdminEmail}
                    onChange={e => setNewAdminEmail(e.target.value)}
                    placeholder="user@example.com"
                    onKeyDown={e => e.key === "Enter" && handleAddAdmin()}
                  />
                  <Button onClick={handleAddAdmin} disabled={addingAdmin} className="flex-shrink-0">
                    <UserPlus className="w-4 h-4 mr-1.5" />Add
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Members Tab ── */}
        <TabsContent value="members">
          <Card>
            <CardHeader>
              <CardTitle>Members ({members.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {members.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">No members yet</p>
              ) : (
                <div className="space-y-2">
                  {members.map(m => (
                    <div key={m.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-slate-800 capitalize">{m.role}</p>
                        <p className="text-xs text-slate-400 font-mono">{m.user_id?.substring(0, 12)}…</p>
                      </div>
                      <Badge variant="outline" className="capitalize text-xs">{m.status || "active"}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Delete Tab ── */}
        <TabsContent value="danger">
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-700 flex items-center gap-2">
                <Trash2 className="w-5 h-5" />Delete Community
              </CardTitle>
              <CardDescription>This action is permanent and cannot be undone.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isPaid && community.subscription_active && !isPlatformAdmin && (
                <Alert className="border-amber-300 bg-amber-50">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-900">
                    You have an active <strong>{community.community_plan}</strong> subscription. Cancel it before deleting the community to avoid being charged.
                  </AlertDescription>
                </Alert>
              )}

              <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2 text-sm text-red-900">
                <p className="font-semibold">This will permanently delete:</p>
                <ul className="list-disc list-inside space-y-1 text-red-800">
                  <li>All community data and settings</li>
                  <li>All member records ({members.length} members)</li>
                  <li>All discussions and posts</li>
                </ul>
              </div>

              {!showDeleteConfirm ? (
                <Button
                  variant="outline"
                  className="w-full border-red-300 text-red-700 hover:bg-red-50"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isPaid && community.subscription_active && !isPlatformAdmin}
                >
                  <Trash2 className="w-4 h-4 mr-2" />I want to delete this community
                </Button>
              ) : (
                <div className="space-y-3 p-4 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-sm font-semibold text-red-900">
                    Type <strong>{communityDisplayName}</strong> to confirm deletion:
                  </p>
                  <Input
                    value={deleteConfirmName}
                    onChange={e => setDeleteConfirmName(e.target.value)}
                    placeholder={communityDisplayName}
                    className="border-red-300 focus:ring-red-500"
                  />
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmName(""); }} className="flex-1">
                      Cancel
                    </Button>
                    <Button
                      onClick={handleDelete}
                      disabled={deleting || deleteConfirmName !== communityDisplayName}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                    >
                      {deleting ? "Deleting…" : "Delete Forever"}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}