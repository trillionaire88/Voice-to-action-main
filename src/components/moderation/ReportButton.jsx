import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Flag } from "lucide-react";
import ReportModal from "./ReportModal";

export default function ReportButton({
  targetType,
  targetId,
  targetPreview = "",
  targetAuthorId = "",
  currentUserId = null,
  size = "sm",
  className = "",
}) {
  const [open, setOpen] = useState(false);

  // Don't show report button for own content
  if (currentUserId && currentUserId === targetAuthorId) return null;

  return (
    <>
      <Button
        variant="ghost"
        size={size}
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className={`text-slate-400 hover:text-orange-600 hover:bg-orange-50 ${className}`}
        title="Report this content"
      >
        <Flag className="w-3.5 h-3.5" />
      </Button>
      {open && (
        <ReportModal
          targetType={targetType}
          targetId={targetId}
          targetPreview={targetPreview}
          targetAuthorId={targetAuthorId}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}