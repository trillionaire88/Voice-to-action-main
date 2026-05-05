import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { getFollowingFeed } from "@/api/socialApi";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CheckCircle2, FileText, BarChart2, MessageSquare, Users, Star, RefreshCw, UserPlus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import FollowButton from "@/components/FollowButton";

const ACTIVITY_CONFIG = {
  petition_created: { icon: FileText, color: "text-blue-600", bg: "bg-blue-50", label: "created a petition" },
  petition_signed: { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", label: "signed a petition" },
  poll_created: { icon: BarChart2, color: "text-purple-600", bg: "bg-purple-50", label: "created a poll" },
  poll_voted: { icon: BarChart2, color: "text-purple-600", bg: "bg-purple-50", label: "voted in a poll" },
  discussion_created: { icon: MessageSquare, color: "text-amber-600", bg: "bg-amber-50", label: "started a discussion" },
  discussion_commented: { icon: MessageSquare, color: "text-amber-600", bg: "bg-amber-50", label: "commented on a discussion" },
  community_joined: { icon: Users, color: "text-teal-600", bg: "bg-teal-50", label: "joined a community" },
  figure_rated: { icon: Star, color: "text-orange-600", bg: "bg-orange-50", label: "rated a public figure" },
  scorecard_created: { icon: Star, color: "text-orange-600", bg: "bg-orange-50", label: "created a scorecard" },
};

export default function FollowingFeed() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [followingCount, setFollowingCount] = useState(0);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUser(user);
      if (user) loadFeed(0, user.id);
    });
  }, []);

  const loadFeed = async (pageNum = 0, userId = null) => {
    setLoading(true);
    try {
      if (userId) {
        const { count } = await supabase
          .from("follows")
          .select("id", { count: "exact", head: true })
          .eq("follower_id", userId);
        setFollowingCount(count || 0);
      }
      const data = await getFollowingFeed(pageNum, 20);
      if (pageNum === 0) setActivities(data);
      else setActivities((prev) => [...prev, ...data]);
      setHasMore(data.length === 20);
      setPage(pageNum);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => loadFeed(page + 1, currentUser?.id);

  if (!currentUser) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <UserPlus className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-700 mb-2">Sign in to see your feed</h2>
        <p className="text-slate-500">Follow other users to see their activity here.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Following</h1>
          <p className="text-slate-500 text-sm mt-0.5">Activity from {followingCount} {followingCount === 1 ? "person" : "people"} you follow</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => loadFeed(0, currentUser?.id)}>
          <RefreshCw className="w-4 h-4 mr-2" />Refresh
        </Button>
      </div>

      {loading && page === 0 ? (
        <div className="space-y-4">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />)}</div>
      ) : activities.length === 0 ? (
        <div className="text-center py-20">
          <UserPlus className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-700 mb-2">Your feed is empty</h2>
          <p className="text-slate-500 mb-6">Follow people from petitions, polls, and discussions to see their activity here.</p>
          <Button onClick={() => { window.location.href = createPageUrl("Discovery"); }} className="bg-blue-600 hover:bg-blue-700">Discover People</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((activity) => {
            const config = ACTIVITY_CONFIG[activity.activity_type] || ACTIVITY_CONFIG.petition_created;
            const Icon = config.icon;
            const profile = activity.profiles;
            return (
              <Card key={activity.id} className="border-slate-200 hover:border-slate-300 transition-colors cursor-pointer" onClick={() => activity.url_path && (window.location.href = activity.url_path)}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="w-10 h-10 flex-shrink-0">
                      <AvatarImage src={profile?.profile_avatar_url} />
                      <AvatarFallback className="bg-blue-100 text-blue-700 font-semibold text-sm">{profile?.display_name?.[0]?.toUpperCase() || "?"}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-800 text-sm">{profile?.display_name}</span>
                        {profile?.is_blue_verified && <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />}
                        <span className="text-slate-500 text-sm">{config.label}</span>
                      </div>
                      {activity.title && <p className="text-slate-700 text-sm font-medium mt-1 truncate">{activity.title}</p>}
                      {activity.summary && <p className="text-slate-500 text-xs mt-0.5 line-clamp-2">{activity.summary}</p>}
                      <div className="flex items-center gap-3 mt-2">
                        <div className={`inline-flex items-center gap-1 ${config.bg} ${config.color} rounded-full px-2 py-0.5 text-xs font-medium`}>
                          <Icon className="w-3 h-3" />
                          {activity.activity_type.replace(/_/g, " ")}
                        </div>
                        <span className="text-slate-400 text-xs">{formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}</span>
                      </div>
                    </div>
                    <FollowButton targetUserId={profile?.id} targetName={profile?.display_name} size="sm" />
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {hasMore && (
            <Button variant="outline" className="w-full" onClick={handleLoadMore} disabled={loading}>
              {loading ? "Loading..." : "Load more"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
