import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Power, Trash2, Plus, Key } from "lucide-react";
import { toast } from "sonner";

function generateAccessCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => chars[b % chars.length]).join("");
}

export default function CommunityAccessCodeSettings({ communityId, user }) {
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);

  const { data: codes = [] } = useQuery({
    queryKey: ["communityAccessCodes", communityId],
    queryFn: () => api.entities.CommunityAccessCode.filter({ community_id: communityId }),
    enabled: !!communityId,
  });

  const handleCreate = async () => {
    setCreating(true);
    try {
      const code = generateAccessCode();
      await api.entities.CommunityAccessCode.create({
        community_id: communityId,
        code,
        active: true,
        created_by: user.id,
        uses_count: 0,
      });
      queryClient.invalidateQueries(["communityAccessCodes", communityId]);
      await api.integrations.Core.SendEmail({
        to: "voicetoaction@outlook.com",
        subject: "New Community Access Code Created",
        body: `A new community access code was created.\n\nCommunity ID: ${communityId}\nCode: ${code}\nCreated by: ${user.email}\nDate: ${new Date().toISOString()}`,
      });
      toast.success("Access code created!");
    } catch {
      toast.error("Failed to create access code");
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (code) => {
    await api.entities.CommunityAccessCode.update(code.id, { active: !code.active });
    queryClient.invalidateQueries(["communityAccessCodes", communityId]);
    toast.success(code.active ? "Code disabled" : "Code enabled");
  };

  const handleDelete = async (code) => {
    await api.entities.CommunityAccessCode.delete(code.id);
    queryClient.invalidateQueries(["communityAccessCodes", communityId]);
    toast.success("Code deleted");
  };

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code);
    toast.success("Access code copied!");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="w-5 h-5 text-purple-600" />
          Community Access Codes
        </CardTitle>
        <CardDescription>
          Create codes to allow specific users to join this community. Share codes privately with approved members.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={handleCreate} disabled={creating} size="sm" className="bg-purple-600 hover:bg-purple-700">
          <Plus className="w-4 h-4 mr-2" />
          {creating ? "Creating..." : "Create New Code"}
        </Button>

        {codes.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6">No access codes yet. Create one to restrict or share community access.</p>
        ) : (
          <div className="space-y-3">
            {codes.map((code) => (
              <div key={code.id} className="flex items-center gap-3 p-3 border rounded-lg bg-slate-50">
                <Key className="w-4 h-4 text-slate-400 shrink-0" />
                <span className={`font-mono font-bold text-sm flex-1 ${!code.active ? "line-through text-slate-400" : "text-slate-800"}`}>
                  {code.code}
                </span>
                <Badge className={code.active
                  ? "bg-green-100 text-green-800 border-green-200"
                  : "bg-slate-100 text-slate-500 border-slate-200"
                }>
                  {code.active ? "Active" : "Disabled"}
                </Badge>
                <span className="text-xs text-slate-400">{code.uses_count || 0} uses</span>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleCopy(code.code)}>
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleToggle(code)}>
                    <Power className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:text-red-700" onClick={() => handleDelete(code)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}