import { useState, useEffect } from "react";
import { api } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Key, Lock } from "lucide-react";
import { toast } from "sonner";

export default function PrivateGroups() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [groupName, setGroupName] = useState("");

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await api.auth.me();
      setUser(currentUser);
    } catch {
      navigate(createPageUrl("Home"));
    }
  };

  const { data: myMemberships = [] } = useQuery({
    queryKey: ["myGroupMemberships", user?.id],
    queryFn: () => api.entities.GroupMember.filter({ user_id: user.id }),
    enabled: !!user,
  });

  const { data: groups = [] } = useQuery({
    queryKey: ["privateGroups", myMemberships],
    queryFn: async () => {
      if (myMemberships.length === 0) return [];
      const allGroups = await api.entities.PrivateGroup.list();
      return allGroups.filter((g) =>
        myMemberships.some((m) => m.group_id === g.id)
      );
    },
    enabled: myMemberships.length > 0,
  });

  const createGroupMutation = useMutation({
    mutationFn: async (name) => {
      const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      const group = await api.entities.PrivateGroup.create({
        name,
        owner_id: user.id,
        invite_code: inviteCode,
        description: "",
      });

      await api.entities.GroupMember.create({
        group_id: group.id,
        user_id: user.id,
        role: "owner",
      });

      return group;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["myGroupMemberships"]);
      queryClient.invalidateQueries(["privateGroups"]);
      toast.success("Group created!");
      setShowCreateDialog(false);
      setGroupName("");
    },
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Private Groups</h1>
          <p className="text-slate-600">Create polls for specific groups</p>
        </div>
        {user && (
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Group
          </Button>
        )}
      </div>

      <div className="grid gap-6">
        {groups.map((group) => (
          <Card key={group.id} className="border-slate-200">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Lock className="w-5 h-5 text-slate-600" />
                    {group.name}
                  </CardTitle>
                  <p className="text-sm text-slate-600 mt-1">
                    {group.member_count} members • {group.polls_count} polls
                  </p>
                </div>
                <Badge variant="outline">
                  <Key className="w-3 h-3 mr-1" />
                  {group.invite_code}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button size="sm" variant="outline">
                  View Polls
                </Button>
                <Button size="sm" variant="outline">
                  Manage Members
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {showCreateDialog && (
        <Dialog open={true} onOpenChange={setShowCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Private Group</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Group Name</Label>
                <Input
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="My Private Group"
                />
              </div>
              <Button
                onClick={() => createGroupMutation.mutate(groupName)}
                disabled={!groupName || createGroupMutation.isPending}
                className="w-full"
              >
                Create Group
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}