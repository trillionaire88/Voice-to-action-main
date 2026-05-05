import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import BaseFeedList from "./BaseFeedList";
import InterestOnboarding from "./InterestOnboarding";

export default function ForYouFeed() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [needsInterests, setNeedsInterests] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("user_interests").select("id,categories").eq("user_id", user.id).maybeSingle();
      const onboarded = localStorage.getItem("feed_onboarded") === "1";
      if (!onboarded || !data?.categories?.length) {
        setShowOnboarding(true);
        setNeedsInterests(true);
      }
    })();
  }, []);

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500">Personalising your feed based on your interests, follows, and engagement.</p>
      {needsInterests && <div className="text-xs text-blue-700 bg-blue-50 border border-blue-200 p-2 rounded-md">Select interests to improve feed quality.</div>}
      <BaseFeedList feedType="for_you" staleTime={120000} />
      <InterestOnboarding open={showOnboarding} onClose={() => setShowOnboarding(false)} />
    </div>
  );
}
