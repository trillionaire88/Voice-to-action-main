import React from "react";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";

export default function BackupStatus() {
  const { user } = useAuth();
  if (!user || !["admin", "owner_admin"].includes(user.role)) return <Navigate to="/" replace />;

  const { data: lastCheck, refetch } = useQuery({
    queryKey: ["backupHealthLastCheck"],
    queryFn: async () => {
      const { data } = await supabase
        .from("security_audit_log")
        .select("created_at, details")
        .eq("event_type", "backup_health_check")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const { data: platformStatus } = useQuery({
    queryKey: ["platformStatusForBackup"],
    queryFn: async () => {
      const { data } = await supabase
        .from("platform_status")
        .select("panic_mode, maintenance_mode")
        .eq("id", 1)
        .maybeSingle();
      return data;
    },
  });

  const runNow = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/backup-health-check`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session?.access_token}`, "Content-Type": "application/json" },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) toast.error(body.error || "Health check failed");
    else toast.success("Health check completed");
    refetch();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <Card>
        <CardHeader><CardTitle>Backup Health Status</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>Last backup health check: {lastCheck?.created_at ? new Date(lastCheck.created_at).toLocaleString("en-AU") : "Never"}</p>
          <p>Panic mode: {platformStatus?.panic_mode ? "Enabled" : "Disabled"}</p>
          <p>Maintenance mode: {platformStatus?.maintenance_mode ? "Enabled" : "Disabled"}</p>
          <Button onClick={runNow}>Run Health Check</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Manual Supabase Backup Checklist</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-1">
          <p>- Enable point-in-time recovery</p>
          <p>- Confirm daily backups are enabled</p>
          <p>- Review retention window and restore drill monthly</p>
        </CardContent>
      </Card>
    </div>
  );
}
