import React, { useState } from "react";
import { api } from '@/api/client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Key, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function CommunityJoinWithCode({ communityId, userId, onSuccess }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError("");
    try {
      const codes = await api.entities.CommunityAccessCode.filter({
        community_id: communityId,
        code: code.trim().toUpperCase(),
        active: true,
      });
      if (!codes.length) {
        setError("Invalid or inactive access code. Please check the code and try again.");
        setLoading(false);
        return;
      }
      // Increment uses
      await api.entities.CommunityAccessCode.update(codes[0].id, {
        uses_count: (codes[0].uses_count || 0) + 1,
      });
      // Send email notification
      await api.integrations.Core.SendEmail({
        to: "voicetoaction@outlook.com",
        subject: "Community Access Code Used",
        body: `A community access code was used to join.\n\nCommunity ID: ${communityId}\nCode: ${code.trim().toUpperCase()}\nUser ID: ${userId}\nDate: ${new Date().toISOString()}`,
      });
      toast.success("Access code accepted! Joining community...");
      onSuccess();
    } catch (e) {
      setError("Failed to verify code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleJoin} className="space-y-3">
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Key className="w-4 h-4 text-purple-600" />
          Enter Access Code
        </Label>
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="XXXXXXXX"
          className="font-mono text-center text-lg tracking-widest uppercase"
          maxLength={12}
        />
      </div>
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800 text-sm">{error}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" disabled={loading || !code.trim()} className="w-full bg-purple-600 hover:bg-purple-700">
        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
        {loading ? "Verifying..." : "Join with Code"}
      </Button>
    </form>
  );
}