import React, { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { appUrl } from "@/constants/siteUrl";

export default function EmbedCodeModal({ open, onOpenChange, petitionId }) {
  const embedCode = useMemo(
    () => `<iframe src="${appUrl(`/EmbedWidget?id=${petitionId}`)}" width="100%" height="200" frameborder="0"></iframe>`,
    [petitionId],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Embed Petition Widget</DialogTitle>
        </DialogHeader>
        <pre className="text-xs bg-slate-50 rounded p-3 overflow-x-auto">{embedCode}</pre>
        <Button
          onClick={async () => {
            await navigator.clipboard.writeText(embedCode);
            toast.success("Embed code copied");
          }}
        >
          Copy Embed Code
        </Button>
      </DialogContent>
    </Dialog>
  );
}
