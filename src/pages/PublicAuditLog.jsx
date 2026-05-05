import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export default function PublicAuditLog() {
  const { data: logs = [] } = useQuery({
    queryKey: ["public-audit-log"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.from("security_audit_log").select("event_type,created_at").order("created_at", { ascending: false }).limit(50);
        if (error) throw error;
        return data || [];
      } catch {
        return [];
      }
    },
    refetchInterval: 30000,
  });
  return (
    <>
      <h1 className="text-3xl font-bold mb-4">Public Audit Log</h1>
      <p className="text-slate-600 mb-4">Transparency events from the platform.</p>
      <div className="space-y-2">
        {(logs || []).map((l, i) => (
          <div key={i} className="p-3 border rounded flex justify-between text-sm">
            <span>{l.event_type}</span>
            <span className="text-slate-500">{new Date(l.created_at).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </>
  );
}
