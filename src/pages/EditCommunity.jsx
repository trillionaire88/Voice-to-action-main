import { useState, useEffect } from "react";
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
  RefreshCw, AlertTriangle, UserPlus, UserMinus, Lock,
  UserCheck, UserX,
} from "lucide-react";
import { toast } from "sonner";
import { sanitiseText } from "@/lib/sanitise";
import { approveMember, rejectMember } from "@/api/communityApi";
import {
  communityName,
  communityDescriptionPublic,
  communityVisibilityValue,
  communityLogoUrl,
  communityBannerUrl,
  communityPlanTier,
  communityOwnerId,
  communityTagsList,
} from "@/lib/communityFields";

function generateAccessCode() {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(36).toUpperCase().padStart(2, "0")).join("").slice(0, 10);
}

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

  const [form, setForm] = useState({
    name: "",
    description_public: "",
    community_type: "",
    visibility: "public",
    join_policy: "open",
    community_location: "",
    community_category: "",
    tags: "",
    private_code: "",
    logo_url: "",
    banner_url: "",
  });

  useEffect(() => {
    api.auth.me().then(setUser).catch(() => navigate("/Communities"));
  }, []);

  const { data: community, isLoading } = useQuery({
    queryKey: ["community", communityId],
    queryFn: () => api.entities.Community.filter({ id: communityId }).then(r => r[0]),
    enabled: !!communityId,
  });

  // Populate form when community loads
  useEffect(() => {
    if (!community) return;
    setForm({
      name: communityName(community),
      description_public: communityDescriptionPublic(community),
      community_type: community.community_type || "",
      visibility: communityVisibilityValue(community),
      join_policy: community.join_policy || "open",
      community_location: community.community_location || "",
      community_category: community.community_category || "",
      tags: communityTagsList(community).join(", "),
      private_code: community.private_code || "",
      logo_url: communityLogoUrl(community),
      banner_url: communityBannerUrl(community),
    });
  }, [community]);

  // All members (active + pending)
  const { data: allMembers = [], refetch: refetchMembers } = useQuery({
    queryKey: ["communityMembersEdit", communityId],
    queryFn: () => api.entities.CommunityMember.filter({ community_id: communityId }),
    enabled: !!communityId,
  });

  const activeMembers = allMembers.filter(m => m.status === "active");
  const pendingMembers = allMembers.filter(m => m.status === "pending_approval");

  const isPlatformAdmin = user?.role === "admin" || user?.role === "owner_admin";
  const isOwner = community && communityOwnerId(community) === user?.id;
  const canAccess = isOwner || isPlatformAdmin;
  const isPrivatePlan = communityPlanTier(community) === "private";

  const saveMutation = useMutation({
    mutationFn: () => {
      const tags = form.tags.split(",").map(t => sanitiseText(t.trim(), 80)).filter(Boolean);
      const safeName = sanitiseText(form.name, 200);
      const safeDesc = sanitiseText(form.description_public, 10000);
      // Private-plan communities are always invite_only — do not allow overriding
      const effectiveJoinPolicy = isPrivatePlan ? "invite_only" : form.join_policy;
      const effectiveVisibility = isPrivatePlan ? "private" : form.visibility;
      return api.entities.Community.update(communityId, {
        name: safeName,
        description_public: safeDesc,
        community_type: form.community_type,
        visibility: effectiveVisibility,
        join_policy: effectiveJoinPolicy,
        community_location: sanitiseText(form.community_location, 500),
        community_category: sanitiseText(form.community_category, 200),
        tags,
        private_code: form.private_code,
        logo_url: sanitiseText(form.logo_url || "", 2000),
        banner_url: sanitiseText(form.banner_url || "", 2000),
      });
    },
    onSuccess: () => {
      toast.success("Community updated!");
      queryClient.invalidateQueries({ queryKey: ["community", communityId] });
    },
    onError: (e) => toast.error("Save failed: " + e.message),
  });

  const regenerateCode = () => {
    const code = generateAccessCode();
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
      if (target.id === communityOwnerId(community)) { toast.error("This user is already the owner"); return; }
      const admins = community.community_admins || [];
      if (admins.includes(target.id)) { toast.error("Already an admin"); return; }
      await api.entities.Community.update(communityId, { community_admins: [...admins, target.id] });
      queryClient.invalidateQueries({ queryKey: ["community", communityId] });
      setNewAdminEmail("");
      toast.success("Admin added!");
    } finally {
      setAddingAdmin(false);
    }
  };

  const handleRemoveAdmin = async (adminId) => {
    const admins = (community.community_admins || []).filter(id => id !== adminId);
    await api.entities.Community.update(communityId, { community_admins: admins });
    queryClient.invalidateQueries({ queryKey: ["community", communityId] });
    toast.success("Admin removed");
  };

  const handleApprove = async (memberId) => {
    try {
      await approveMember(memberId);
      refetchMembers();
      queryClient.invalidateQueries({ queryKey: ["communityMembers", communityId] });
      toast.success("Member approved");
    } catch {
      toast.error("Failed to approve member");
    }
  };

  const handleReject = async (memberId) => {
    try {
      await rejectMember(memberId);
      refetchMembers();
      toast.success("Request rejected");
    } catch {
      toast.error("Failed to reject request");
    }
  };

  const handleDelete = async () => {
    const targetName = communityName(community);
    if (deleteConfirmName !== targetName) {
      toast.error("Community name doesn't match");
      return;
    }
    const isPaid = ["paid", "private"].includes(communityPlanTier(community));
    if (isPaid && community.subscription_active && !isPlatformAdmin) {
      toast.error("Cancel your subscription before deleting a paid community");
      return;
    }
    setDeleting(true);
    try {
      await Promise.all(allMembers.map(m => api.entities.CommunityMember.delete(m.id)));
      const discs = await api.entities.CommunityDiscussion.filter({ community_id: communityId });
      await Promise.all(discs.map(d => api.entities.CommunityDiscussion.delete(d.id)));
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

  const communityDisplayName = communityName(community) || "Community";
  const admins = community.community_admins || [];
  const isPaid = ["paid", "private"].includes(communityPlanTier(community));

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 pb-16">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/CommunityDetail?id=${communityId}`)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manage Community</h1>
          <p className="text-sm text-slate-500">{communityDisplayName}</p>
        </div>
        <Badge className="ml-auto capitalize bg-slate-100 text-slate-700">{communityPlanTier(community)}</Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="edit"><Settings className="w-4 h-4 mr-1.5" />Edit</TabsTrigger>
          <TabsTrigger value="admins"><Shield className="w-4 h-4 mr-1.5" />Admins</TabsTrigger>
          <TabsTrigger value="members">
            <Users className="w-4 h-4 mr-1.5" />Members
            {pendingMembers.length > 0 && (
              <span className="ml-1.5 bg-amber-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{pendingMembers.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="danger" className="text-red-600"><Trash2 className="w-4 h-4 mr-1.5" />Delete</TabsTrigger>
        </TabsList>

        {/* Edit Tab */}
        <TabsContent value="edit">
          <Card>
            <CardHeader>
              <CardTitle>Edit Community Details</CardTitle>
              <CardDescription>Update name, description, type, and access settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Community Name *</Label>
                <Input className="mt-1" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <Label>Description *</Label>
                <Textarea className="mt-1" rows={3} value={form.description_public} onChange={e => setForm(f => ({ ...f, description_public: e.target.value }))} />
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

              {!isPrivatePlan && (
                <>
                  <div>
                    <Label>Visibility</Label>
                    <Select value={form.visibility} onValueChange={v => setForm(f => ({ ...f, visibility: v }))}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">Public — discoverable by anyone</SelectItem>
                        <SelectItem value="invite_only">Invite Only — hidden from search</SelectItem>
                        <SelectItem value="private">Private — hidden from directory</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Join Policy</Label>
                    <Select value={form.join_policy} onValueChange={v => setForm(f => ({ ...f, join_policy: v }))}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open — anyone can join instantly</SelectItem>
                        <SelectItem value="approval_required">Approval Required — admin reviews requests</SelectItem>
                        <SelectItem value="invite_only">Invite Only — access code required</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-500 mt-1">
                      {form.join_policy === "open" && "Members join with one click. No approval needed."}
                      {form.join_policy === "approval_required" && "Members send a join request. Approve or reject from the Members tab."}
                      {form.join_policy === "invite_only" && "Members need a valid access code to join. Manage codes in Community Settings."}
                    </p>
                  </div>
                </>
              )}

              {isPrivatePlan && (
                <Alert className="border-purple-200 bg-purple-50">
                  <Lock className="h-4 w-4 text-purple-600" />
                  <AlertDescription className="text-purple-900 text-sm">
                    Private communities are always invite-only and hidden from the directory. Manage access codes in the community settings tab.
                  </AlertDescription>
                </Alert>
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
                <Input className="mt-1" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
              </div>
              <div>
                <Label>Logo URL</Label>
                <Input className="mt-1" value={form.logo_url} onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))} placeholder="https://…" />
              </div>
              <div>
                <Label>Banner URL</Label>
                <Input className="mt-1" value={form.banner_url} onChange={e => setForm(f => ({ ...f, banner_url: e.target.value }))} placeholder="https://…" />
              </div>

              {/* Private access code */}
              <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                <div className="flex items-center justify-between mb-2">
                  <Label>Private Access Code</Label>
                  <Button size="sm" variant="outline" onClick={regenerateCode}>
                    <RefreshCw className="w-3 h-3 mr-1.5" />Regenerate
                  </Button>
                </div>
                <Input value={form.private_code} onChange={e => setForm(f => ({ ...f, private_code: e.target.value }))} placeholder="No code set" className="font-mono" />
                <p className="text-xs text-slate-500 mt-1">Share this code with users you want to invite. Also manage per-user access codes in the community settings.</p>
              </div>

              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="w-full bg-blue-600 hover:bg-blue-700">
                <Save className="w-4 h-4 mr-2" />
                {saveMutation.isPending ? "Saving…" : "Save Changes"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Admins Tab */}
        <TabsContent value="admins">
          <Card>
            <CardHeader>
              <CardTitle>Admin Management</CardTitle>
              <CardDescription>Admins can moderate content but cannot delete the community or remove the owner.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <Shield className="w-5 h-5 text-amber-600" />
                <div>
                  <p className="font-semibold text-slate-900 text-sm">Owner</p>
                  <p className="text-xs text-slate-500">{user?.full_name} — full control</p>
                </div>
                <Badge className="ml-auto bg-amber-100 text-amber-700">Owner</Badge>
              </div>

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

        {/* Members Tab */}
        <TabsContent value="members">
          <div className="space-y-4">
            {/* Pending requests */}
            {pendingMembers.length > 0 && (
              <Card className="border-amber-200">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-amber-600" />
                    Pending Join Requests
                    <Badge className="bg-amber-500 text-white">{pendingMembers.length}</Badge>
                  </CardTitle>
                  <CardDescription>Review and approve or reject each request.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {pendingMembers.map(m => (
                      <div key={m.id} className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-slate-900 font-mono">{m.user_id?.substring(0, 16)}…</p>
                          <p className="text-xs text-slate-500">Awaiting approval</p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleApprove(m.id)}>
                            <UserCheck className="w-3 h-3 mr-1" />Approve
                          </Button>
                          <Button size="sm" variant="outline" className="border-red-300 text-red-600 hover:bg-red-50" onClick={() => handleReject(m.id)}>
                            <UserX className="w-3 h-3 mr-1" />Reject
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Active members */}
            <Card>
              <CardHeader>
                <CardTitle>Active Members ({activeMembers.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {activeMembers.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-8">No active members yet</p>
                ) : (
                  <div className="space-y-2">
                    {activeMembers.map(m => (
                      <div key={m.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                        <div>
                          <p className="text-sm font-medium text-slate-800 capitalize">{m.role}</p>
                          <p className="text-xs text-slate-400 font-mono">{m.user_id?.substring(0, 16)}…</p>
                        </div>
                        <Badge variant="outline" className="capitalize text-xs">{m.status || "active"}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Delete Tab */}
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
                    You have an active <strong>{communityPlanTier(community)}</strong> subscription. Cancel it first to avoid ongoing charges.
                  </AlertDescription>
                </Alert>
              )}

              <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2 text-sm text-red-900">
                <p className="font-semibold">This will permanently delete:</p>
                <ul className="list-disc list-inside space-y-1 text-red-800">
                  <li>All community data and settings</li>
                  <li>All member records ({allMembers.length} members)</li>
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
                    Type <strong>{communityDisplayName}</strong> to confirm:
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
