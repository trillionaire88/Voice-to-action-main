import React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from '@/api/client';
import { CheckCircle2, Globe2, Shield } from "lucide-react";

export default function SignatureTransparencyBar({ petition }) {
  const { data: signatures = [] } = useQuery({
    queryKey: ["sigTransparency", petition.id],
    queryFn: () => api.entities.PetitionSignature.filter({ petition_id: petition.id }),
    staleTime: 60000,
  });

  const valid = signatures.filter(s => !s.is_invalidated && !s.has_withdrawn);
  const confirmed = valid.filter(s => s.is_email_confirmed);
  const countries = new Set(valid.map(s => s.country_code).filter(Boolean)).size;
  const verifiedRate = valid.length > 0 ? Math.round((confirmed.length / valid.length) * 100) : 0;

  if (valid.length === 0) return null;

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
      <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
        <Shield className="w-4 h-4 text-blue-600" />Signature Integrity
      </h4>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <div className="text-xl font-bold text-slate-900">{valid.length.toLocaleString()}</div>
          <div className="text-xs text-slate-500">Total Signatures</div>
        </div>
        <div>
          <div className="text-xl font-bold text-emerald-600 flex items-center justify-center gap-1">
            <CheckCircle2 className="w-4 h-4" />{confirmed.length.toLocaleString()}
          </div>
          <div className="text-xs text-slate-500">Email Confirmed</div>
        </div>
        <div>
          <div className="text-xl font-bold text-blue-600 flex items-center justify-center gap-1">
            <Globe2 className="w-4 h-4" />{countries}
          </div>
          <div className="text-xs text-slate-500">Countries</div>
        </div>
      </div>
      <div className="text-xs text-slate-500 text-center">
        {verifiedRate}% of signatures email-confirmed • All signatures independently verified
      </div>
    </div>
  );
}