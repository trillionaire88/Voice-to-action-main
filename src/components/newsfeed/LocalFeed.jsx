import React from "react";
import { useAuth } from "@/lib/AuthContext";
import BaseFeedList from "./BaseFeedList";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";

export default function LocalFeed() {
  const { user } = useAuth();
  if (!user?.country_code) {
    return (
      <div className="text-center py-10">
        <p className="text-slate-600 mb-3">Set your location to see local content.</p>
        <Button asChild><a href={createPageUrl("Profile")}>Update Profile</a></Button>
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-semibold text-slate-800 mb-3">🇦🇺 Your Local Feed — {user.country_code}</h2>
      <BaseFeedList feedType="local" countryCode={user.country_code} staleTime={120000} />
    </div>
  );
}
