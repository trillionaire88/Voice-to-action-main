import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Share2, Copy, Mail, MessageCircle, Send, Linkedin } from "lucide-react";
import { toast } from "sonner";

const XIcon = () => <span className="font-bold text-sm">X</span>;
const FacebookIcon = () => <span className="font-bold text-sm">f</span>;

export default function SocialShareButtons({
  title = "Voice to Action",
  url = window.location.href,
  shareCount = 0,
  className = "",
}) {
  const [copied, setCopied] = useState(false);
  const encodedTitle = encodeURIComponent(title);
  const encodedUrl = encodeURIComponent(url);

  const shareTargets = useMemo(
    () => [
      {
        label: "WhatsApp",
        icon: MessageCircle,
        color: "bg-green-50 text-green-700 border-green-200",
        href: `https://wa.me/?text=${encodeURIComponent(`${title} - Sign now: ${url}`)}`,
      },
      {
        label: "Facebook",
        icon: FacebookIcon,
        color: "bg-blue-50 text-blue-700 border-blue-200",
        href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      },
      {
        label: "Twitter/X",
        icon: XIcon,
        color: "bg-slate-50 text-slate-700 border-slate-200",
        href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
      },
      {
        label: "LinkedIn",
        icon: Linkedin,
        color: "bg-sky-50 text-sky-700 border-sky-200",
        href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      },
      {
        label: "Telegram",
        icon: Send,
        color: "bg-cyan-50 text-cyan-700 border-cyan-200",
        href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
      },
      {
        label: "Email",
        icon: Mail,
        color: "bg-amber-50 text-amber-700 border-amber-200",
        href: `mailto:?subject=${encodedTitle}&body=${encodeURIComponent(`I thought you should see this: ${url}`)}`,
      },
    ],
    [encodedTitle, encodedUrl, title, url],
  );

  const openShare = async (href) => {
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        window.open(href, "_blank", "noopener,noreferrer,width=700,height=600");
      }
    } else {
      window.open(href, "_blank", "noopener,noreferrer,width=700,height=600");
    }
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Share2 className="w-4 h-4 text-slate-600" />
          <h3 className="text-sm font-semibold text-slate-900">Share</h3>
        </div>
        <span className="text-xs text-slate-500">{shareCount || 0} shares</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {shareTargets.map((target) => {
          const Icon = target.icon;
          return (
            <Button
              key={target.label}
              variant="outline"
              className={`justify-start ${target.color}`}
              onClick={() => openShare(target.href)}
            >
              <Icon className="w-4 h-4 mr-2" />
              {target.label}
            </Button>
          );
        })}
        <Button variant="outline" className="justify-start border-violet-200 text-violet-700 bg-violet-50" onClick={copyLink}>
          <Copy className="w-4 h-4 mr-2" />
          {copied ? "Copied!" : "Copy Link"}
        </Button>
      </div>
    </div>
  );
}
