import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Key, Loader2, CheckCircle2 } from "lucide-react";
import { joinCommunityWithAccessCode } from "@/api/communityApi";

export default function CommunityJoinWithCode({ communityId, onSuccess }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError("");
    try {
      await joinCommunityWithAccessCode(communityId, code.trim());
      onSuccess();
    } catch (err) {
      setError(err.message || "Invalid or inactive access code. Please check the code and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleJoin} className="space-y-3">
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <Key className="w-4 h-4 text-purple-600" />
          Enter Access Code
        </label>
        <input
          value={code}
          onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(""); }}
          placeholder="XXXXXXXX"
          className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-center text-lg tracking-widest uppercase focus:outline-none focus:border-purple-500"
          maxLength={16}
        />
      </div>
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800 text-sm">{error}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" disabled={loading || !code.trim()} className="w-full bg-purple-600 hover:bg-purple-700">
        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
        {loading ? "Verifying…" : "Join with Code"}
      </Button>
    </form>
  );
}
