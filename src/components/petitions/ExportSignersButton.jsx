import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ExportSignersButton({ petition, hasPaid = false }) {
  const [isExporting, setIsExporting] = useState(false);
  const navigate = useNavigate();

  const handleExportCSV = async () => {
    if (!hasPaid) {
      navigate(createPageUrl("PetitionWithdraw") + `?id=${petition.id}`);
      return;
    }

    setIsExporting(true);
    try {
      const escape = (val) => `"${String(val || '').replace(/"/g, '""')}"`;

      const headerLines = [
        `Platform,Voice to Action`,
        `Entity,Voice to Action Pty Ltd`,
        `Document,Petition Summary`,
        `Note,This summary does not include personal signer data`,
        `Website,https://voice-to-action.app`,
        ``,
        `Title,${escape(petition.title)}`,
        `Description,${escape(petition.short_summary || '')}`,
        `Creator,${escape(petition.creator_name || '')}`,
        `Date,${escape(petition.created_date ? format(new Date(petition.created_date), 'PPP') : '')}`,
        `Total Signatures,${petition.signature_count_total || 0}`,
        `Goal,${petition.signature_goal || 0}`,
        `Verified Signatures,${petition.signature_count_verified || 0}`,
        `Verification Score,N/A`,
        `Status,${escape(petition.status || '')}`,
        `Category,${escape((petition.category || '').replace(/_/g, ' '))}`,
        `Country,${escape(petition.country_code || '')}`,
        ``,
        `DISCLAIMER`,
        `This document is a petition summary only.`,
        `Personal signer data is not included.`,
        `The official petition is hosted on Voice to Action.`,
      ];

      const blob = new Blob([headerLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.setAttribute('download', 'voice_to_action_petition_summary.csv');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Petition summary CSV downloaded');
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Failed to export CSV");
    } finally {
      setIsExporting(false);
    }
  };

  if (!hasPaid) {
    return (
      <Button
        onClick={handleExportCSV}
        variant="outline"
        className="w-full border-amber-300 text-amber-700 hover:bg-amber-50"
      >
        <Lock className="w-4 h-4 mr-2" />
        Export CSV Summary ($1.99)
      </Button>
    );
  }

  return (
    <Button
      onClick={handleExportCSV}
      disabled={isExporting}
      variant="outline"
      className="w-full border-slate-300"
    >
      {isExporting ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Exporting...
        </>
      ) : (
        <>
          <Download className="w-4 h-4 mr-2" />
          Export CSV Summary
        </>
      )}
    </Button>
  );
}