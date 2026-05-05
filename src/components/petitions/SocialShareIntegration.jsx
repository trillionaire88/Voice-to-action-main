import { Button } from "@/components/ui/button";
import { Share2, Twitter, Facebook } from "lucide-react";

export default function SocialShareIntegration() {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-slate-600">Share:</span>
      <Button size="icon" variant="ghost" className="h-8 w-8" title="Share on Twitter">
        <Twitter className="w-4 h-4" />
      </Button>
      <Button size="icon" variant="ghost" className="h-8 w-8" title="Share on Facebook">
        <Facebook className="w-4 h-4" />
      </Button>
      <Button size="icon" variant="ghost" className="h-8 w-8" title="More options">
        <Share2 className="w-4 h-4" />
      </Button>
    </div>
  );
}