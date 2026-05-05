import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, MapPin, Camera, AlertCircle } from "lucide-react";

export default function ProfileCompletionCard({ user, onEditProfile }) {
  const navigate = useNavigate();
  const missing = [];

  if (!user?.profile_avatar_url) {
    missing.push({ id: "photo", icon: Camera, label: "Add a profile photo", action: () => document.getElementById("avatar-upload-input")?.click() });
  }
  if (!user?.bio?.trim()) {
    missing.push({ id: "bio", icon: User, label: "Write a short bio", action: onEditProfile });
  }
  if (!user?.country_code) {
    missing.push({ id: "country", icon: MapPin, label: "Set your country", action: () => navigate(createPageUrl("SecuritySettings")) });
  }

  if (missing.length === 0) return null;

  return (
    <Card className="border-amber-200 bg-amber-50 mb-6">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start gap-3 mb-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-slate-900 text-sm">Complete your profile</p>
            <p className="text-xs text-slate-500 mt-0.5">Profiles with photos and bios get more trust from the community</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {missing.map(item => {
            const Icon = item.icon;
            return (
              <Button key={item.id} size="sm" variant="outline"
                className="border-amber-300 bg-white hover:bg-amber-50 text-slate-700 h-8 text-xs gap-1.5"
                onClick={item.action}>
                <Icon className="w-3.5 h-3.5 text-amber-600" />
                {item.label}
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}