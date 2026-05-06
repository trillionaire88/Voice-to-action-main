import { memo, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MoreHorizontal, Bookmark, Share2, Flag, EyeOff, Flame, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/lib/supabase";
import { cleanForDB } from "@/lib/dbHelpers";
import ProfileAvatar from "@/components/profile/ProfileAvatar";
import { recordFeedInteraction } from "./feedApi";

const typeStyles = {
  petition: { color: "text-emerald-700", bg: "bg-emerald-50", label: "Petition" },
  poll: { color: "text-blue-700", bg: "bg-blue-50", label: "Poll" },
  discussion: { color: "text-purple-700", bg: "bg-purple-50", label: "Discussion" },
  scorecard: { color: "text-amber-700", bg: "bg-amber-50", label: "Scorecard" },
  community: { color: "text-teal-700", bg: "bg-teal-50", label: "Community" },
  news: { color: "text-red-700", bg: "bg-red-50", label: "News" },
  figure: { color: "text-slate-700", bg: "bg-slate-50", label: "Figure" },
};

const pathByType = {
  petition: "/PetitionDetail",
  poll: "/PollDetail",
  discussion: "/PolicyDiscussions",
  scorecard: "/ScorecardDetail",
  community: "/CommunityDetail",
  figure: "/FigureProfile",
};

function ago(ts) {
  const d = Date.now() - new Date(ts).getTime();
  const h = Math.floor(d / (1000 * 60 * 60));
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function countryFlag(code) {
  if (!code || code === "GLOBAL") return "🌍 Global";
  return `🇦🇺 ${code}`;
}

function FeedItemCardBase({ item, onHidden }) {
  const navigate = useNavigate();
  const ref = useRef(null);
  const [hidden, setHidden] = useState(false);
  const [saved, setSaved] = useState(false);
  const [following, setFollowing] = useState(!!item.creator?.is_following);
  const style = typeStyles[item.content_type] || typeStyles.news;
  const velocityHot = Number(item.engagement?.velocity || 0) >= 20;

  const display = useMemo(() => {
    const c = item.content || {};
    return {
      title: c.title || c.question || c.subject_name || c.name || "Untitled",
      description: c.short_summary || c.description || "",
      image: c.image_url || c.thumbnail || null,
      externalUrl: c.url || null,
    };
  }, [item]);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    let timer = null;
    const observer = new IntersectionObserver((entries) => {
      const e = entries[0];
      if (e?.isIntersecting) {
        timer = setTimeout(() => {
          recordFeedInteraction({
            content_type: item.content_type,
            content_id: item.id,
            interaction_type: "view",
            category: item.category,
            country_code: item.country_code,
          });
        }, 2000);
      } else if (timer) {
        clearTimeout(timer);
      }
    }, { threshold: 0.6 });
    observer.observe(node);
    return () => {
      observer.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, [item]);

  const go = () => {
    recordFeedInteraction({
      content_type: item.content_type,
      content_id: item.id,
      interaction_type: "click",
      category: item.category,
      country_code: item.country_code,
    });
    if (item.content_type === "news" && display.externalUrl) window.open(display.externalUrl, "_blank", "noopener,noreferrer");
    else navigate(`${pathByType[item.content_type] || "/Discovery"}?id=${item.id}`);
  };

  const toggleSave = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (saved) {
      await supabase.from("saved_items").delete().eq("user_id", user.id).eq("content_type", item.content_type).eq("content_id", item.id);
    } else {
      await supabase.from("saved_items").upsert(cleanForDB({ user_id: user.id, content_type: item.content_type, content_id: item.id }), { onConflict: "user_id,content_type,content_id" });
    }
    setSaved((s) => !s);
  };

  const hide = async () => {
    await recordFeedInteraction({
      content_type: item.content_type,
      content_id: item.id,
      interaction_type: "hide",
      category: item.category,
      country_code: item.country_code,
    });
    setHidden(true);
    setTimeout(() => onHidden?.(item.id), 220);
  };

  const followCreator = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !item.creator?.id) return;
    await supabase.from("follows").upsert(cleanForDB({ follower_id: user.id, following_id: item.creator.id }), { onConflict: "follower_id,following_id" });
    setFollowing(true);
    await recordFeedInteraction({ content_type: item.content_type, content_id: item.id, interaction_type: "follow", category: item.category, country_code: item.country_code });
  };

  if (hidden) return <div className="h-0 opacity-0 transition-all duration-200" />;

  return (
    <Card ref={ref} className="border-slate-200 shadow-sm hover:shadow-md transition-all duration-200">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <ProfileAvatar user={{ display_name: item.creator?.name || "User", profile_avatar_url: item.creator?.avatar_url, is_blue_verified: item.creator?.is_verified }} size="sm" showBadge />
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{item.creator?.name || "Voice to Action"}</p>
              <p className="text-xs text-slate-500">{ago(item.created_at)}</p>
            </div>
            {!following && item.creator?.id && (
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={followCreator}>
                Follow
              </Button>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={hide}><EyeOff className="w-4 h-4 mr-2" />Hide</DropdownMenuItem>
              <DropdownMenuItem onClick={() => alert("Report submitted")}><Flag className="w-4 h-4 mr-2" />Report</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={`${style.bg} ${style.color} border`}>{style.label}</Badge>
          <Badge variant="outline" className="text-xs">{countryFlag(item.country_code)}</Badge>
          {item.reason && <Badge variant="secondary" className="text-xs">{item.reason}</Badge>}
        </div>

        {item.content_type === "news" && display.image && (
          <img src={display.image} alt={display.title} loading="lazy" className="w-full h-40 object-cover rounded-md bg-slate-100" />
        )}

        <button onClick={go} className="w-full text-left">
          <h3 className="font-semibold text-slate-900 line-clamp-2">{display.title}</h3>
          {display.description && <p className="text-sm text-slate-600 line-clamp-2 mt-1">{display.description}</p>}
        </button>

        <div className="flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>{(item.engagement?.count || 0).toLocaleString()} {item.engagement?.label || "engagement"}</span>
            {velocityHot && <span className="inline-flex items-center text-red-600"><Flame className="w-3 h-3 mr-1" />Hot</span>}
          </div>
          {item.content_type === "news" && <span className="inline-flex items-center">External Source <ExternalLink className="w-3 h-3 ml-1" /></span>}
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="text-xs" onClick={toggleSave}><Bookmark className="w-4 h-4 mr-1" />{saved ? "Saved" : "Save"}</Button>
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigator.clipboard.writeText(window.location.origin + (pathByType[item.content_type] || "/Discovery") + `?id=${item.id}`)}><Share2 className="w-4 h-4 mr-1" />Share</Button>
        </div>
      </CardContent>
    </Card>
  );
}

const FeedItemCard = memo(FeedItemCardBase);
export default FeedItemCard;
