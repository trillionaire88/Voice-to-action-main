import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function BreachAlertPanel() {
  const [ids, setIds] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("high");
  const [busy, setBusy] = useState(false);

  const { data: history = [], refetch } = useQuery({
    queryKey: ["breachAlertHistory"],
    queryFn: async () => {
      const { data } = await supabase
        .from("security_audit_log")
        .select("*")
        .eq("event_type", "breach_alert_sent")
        .order("created_at", { ascending: false })
        .limit(30);
      return data || [];
    },
  });

  const sendAlerts = async () => {
    if (!window.confirm("Send breach alerts to selected users?")) return;
    setBusy(true);
    try {
      const affectedUserIds = ids.split(",").map((v) => v.trim()).filter(Boolean);
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/breach-alert`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session?.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ affectedUserIds, breachDescription: description, severity }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Failed");
      toast.success(`Sent alerts to ${body.sent} users`);
      refetch();
    } catch (e) {
      toast.error(e.message || "Failed to send alerts");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border-red-200">
      <CardHeader><CardTitle>Breach Alert Panel</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <Input value={ids} onChange={(e) => setIds(e.target.value)} placeholder="User IDs (comma separated)" />
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Breach description" />
        <Select value={severity} onValueChange={setSeverity}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="low">low</SelectItem>
            <SelectItem value="medium">medium</SelectItem>
            <SelectItem value="high">high</SelectItem>
            <SelectItem value="critical">critical</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={sendAlerts} disabled={busy || !ids || !description}>
          {busy ? "Sending..." : "Send Breach Alerts"}
        </Button>
        <div className="space-y-2 pt-2">
          {history.map((h) => (
            <div key={h.id} className="text-xs border rounded p-2">
              {new Date(h.created_at).toLocaleString("en-AU")} · {h.user_id}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
