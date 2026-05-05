import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";

export default function PrivacyCompliance() {
  const { user } = useAuth();

  const { data: report, refetch } = useQuery({
    queryKey: ["privacyComplianceReport"],
    enabled: !!user && user.role === "owner_admin",
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/privacy-compliance-report`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session?.access_token}`, "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed report");
      return res.json();
    },
  });

  const { data: pending = [], refetch: refetchPending } = useQuery({
    queryKey: ["pendingDeletionRequestsCompliance"],
    enabled: !!user && user.role === "owner_admin",
    queryFn: async () => {
      const { data } = await supabase
        .from("data_deletion_requests")
        .select("*")
        .eq("status", "pending")
        .order("requested_at", { ascending: false });
      return data || [];
    },
  });

  if (!user || user.role !== "owner_admin") return <Navigate to="/" replace />;

  const processDeletion = async (id) => {
    const { data: { session } } = await supabase.auth.getSession();
    await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-data-deletion`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session?.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ action: "process", request_id: id }),
    });
    toast.success("Deletion request processed");
    refetchPending();
    refetch();
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <Card>
        <CardHeader><CardTitle>Privacy Compliance Report</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-1">
          <p>Generated at: {report?.generated_at ? new Date(report.generated_at).toLocaleString("en-AU") : "—"}</p>
          <p>Total users: {report?.total_registered_users ?? "—"}</p>
          <p>Verified identity users: {report?.users_with_verified_identity ?? "—"}</p>
          <p>Pending deletion requests: {report?.pending_data_deletion_requests ?? "—"}</p>
          <p>Completed deletions (30d): {report?.completed_data_deletions_last_30_days ?? "—"}</p>
          <Button onClick={() => window.print()}>Download Report</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Deletion Queue</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {pending.map((p) => (
            <div key={p.id} className="border rounded p-3 flex justify-between items-center">
              <span className="text-sm">{p.user_id}</span>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => processDeletion(p.id)}>Approve</Button>
                <Button size="sm" variant="outline">Reject</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
