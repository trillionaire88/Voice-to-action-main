import React from "react";
import { Button } from "@/components/ui/button";
import {
  Share2,
  Mail,
} from "lucide-react";
import { toast } from "sonner";

// Social media icons
const TwitterIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2s9 5 20 5a9.5 9.5 0 00-9-5.5c4.75-2.35 7-7 7-11.65a4.44 4.44 0 00-.78-1.58z" />
  </svg>
);

const FacebookIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M18 2h-3a6 6 0 00-6 6v3H7v4h2v8h4v-8h3l1-4h-4V8a2 2 0 012-2h3z" />
  </svg>
);

const WhatsAppIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M17.6 6.32c-1.57-1.56-3.63-2.42-5.84-2.42-4.55 0-8.26 3.71-8.26 8.26 0 1.45.37 2.86 1.08 4.11L3.06 21l4.41-1.15c1.2.65 2.56 1 3.98 1h.01c4.55 0 8.26-3.71 8.26-8.26 0-2.21-.87-4.27-2.44-5.84zM11.45 19.52h-.01c-1.23 0-2.44-.31-3.5-.9l-.25-.15-2.61.68.7-2.55-.16-.26c-.67-1.09-1.02-2.33-1.02-3.61 0-3.78 3.08-6.86 6.86-6.86 1.83 0 3.56.71 4.85 2.01s2.01 3.02 2.01 4.85c0 3.79-3.08 6.87-6.86 6.87z" />
  </svg>
);

const InstagramIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" fill="none" stroke="currentColor" strokeWidth="2" />
    <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" fill="none" stroke="currentColor" strokeWidth="2" />
    <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" />
  </svg>
);

const TikTokIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v12.67a2.89 2.89 0 11-5.92-2.87 2.89 2.89 0 012.31 1.41V9.4a6.29 6.29 0 10-5.88 7.72v-3.5a8.05 8.05 0 001.19.4v-3.4c-.68-.45-1.25-1.13-1.57-1.98h-3.4v12.41c0 4.08 3.32 7.39 7.39 7.39s7.39-3.31 7.39-7.39V9.42c1.54 1.02 3.37 1.63 5.37 1.63V8.12a8.04 8.04 0 01-3.51-.83z" />
  </svg>
);

export default function SocialShareButtons({ petition, petitionUrl }) {
  const shareText = `Check out this petition: "${petition.title}" - ${petition.short_summary}`;
  const encodedUrl = encodeURIComponent(petitionUrl);
  const encodedText = encodeURIComponent(shareText);

  const socialPlatforms = [
    {
      name: "Twitter",
      icon: TwitterIcon,
      url: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      color: "text-sky-500 hover:bg-sky-50",
    },
    {
      name: "Facebook",
      icon: FacebookIcon,
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      color: "text-blue-600 hover:bg-blue-50",
    },
    {
      name: "WhatsApp",
      icon: WhatsAppIcon,
      url: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
      color: "text-green-600 hover:bg-green-50",
    },
    {
      name: "Instagram",
      icon: InstagramIcon,
      url: `https://www.instagram.com/?url=${encodedUrl}`,
      color: "text-pink-600 hover:bg-pink-50",
      onClick: () => {
        toast.info("Copy the link and share it on your Instagram story or DM!");
        navigator.clipboard.writeText(petitionUrl);
      },
    },
    {
      name: "TikTok",
      icon: TikTokIcon,
      url: `https://www.tiktok.com/share?url=${encodedUrl}`,
      color: "text-slate-900 hover:bg-slate-100",
    },
  ];

  const handleCopyLink = () => {
    navigator.clipboard.writeText(petitionUrl);
    toast.success("Petition link copied to clipboard!");
  };

  const handleEmailShare = () => {
    const subject = encodeURIComponent(`Check out this petition: ${petition.title}`);
    const body = encodeURIComponent(
      `I found a petition I think you should sign:\n\n"${petition.title}"\n\n${petition.short_summary}\n\nSign it here: ${petitionUrl}`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <Share2 className="w-4 h-4 text-slate-600" />
        <h3 className="font-semibold text-slate-900 text-sm">Share This Petition</h3>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {socialPlatforms.map((platform) => {
          const Icon = platform.icon;
          return (
            <Button
              key={platform.name}
              variant="ghost"
              size="sm"
              title={platform.name}
              className={`${platform.color} flex flex-col items-center gap-1 h-auto py-3 px-2`}
              onClick={
                platform.onClick ||
                (() => window.open(platform.url, "_blank", "width=600,height=400"))
              }
            >
              <Icon />
              <span className="text-xs font-medium">{platform.name}</span>
            </Button>
          );
        })}
      </div>

      <div className="pt-2 border-t border-slate-200 space-y-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs"
          onClick={handleCopyLink}
        >
          <Share2 className="w-3 h-3 mr-1" />
          Copy Link
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs"
          onClick={handleEmailShare}
        >
          <Mail className="w-3 h-3 mr-1" />
          Email to Friend
        </Button>
      </div>

      <p className="text-xs text-slate-500 text-center py-2 bg-slate-50 rounded">
        Share to increase visibility and gather more support for this cause
      </p>
    </div>
  );
}