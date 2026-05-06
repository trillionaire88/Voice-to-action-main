import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Leaf, GraduationCap, Briefcase, Heart, Zap } from "lucide-react";

const WORLD_THEMES = [
  {
    id: "climate",
    name: "Climate World",
    icon: Leaf,
    color: "from-green-600 to-emerald-600",
    topics: ["environment", "climate", "sustainability"],
  },
  {
    id: "education",
    name: "Education World",
    icon: GraduationCap,
    color: "from-blue-600 to-indigo-600",
    topics: ["education", "learning", "schools"],
  },
  {
    id: "economy",
    name: "Economy World",
    icon: Briefcase,
    color: "from-purple-600 to-violet-600",
    topics: ["economy", "work", "finance"],
  },
  {
    id: "health",
    name: "Health World",
    icon: Heart,
    color: "from-red-600 to-pink-600",
    topics: ["health", "wellness", "medicine"],
  },
  {
    id: "tech",
    name: "Tech World",
    icon: Zap,
    color: "from-amber-600 to-orange-600",
    topics: ["technology", "innovation", "digital"],
  },
];

export default function ThematicWorlds() {
  const navigate = useNavigate();

  const { data: polls = [] } = useQuery({
    queryKey: ["allPolls"],
    queryFn: async () => {
      const { data } = await supabase.from("polls").select("*");
      return data || [];
    },
  });

  const getWorldStats = (topics) => {
    const worldPolls = polls.filter((p) =>
      topics.some((t) => p.tags?.includes(t) || p.category?.includes(t))
    );
    return {
      pollCount: worldPolls.length,
      votes: worldPolls.reduce((sum, p) => sum + (p.total_votes_cached || 0), 0),
    };
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Thematic Worlds</h1>
        <p className="text-slate-600">
          Explore issues by topic - climate, education, economy, and more
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {WORLD_THEMES.map((world) => {
          const Icon = world.icon;
          const stats = getWorldStats(world.topics);

          return (
            <Card
              key={world.id}
              className="border-slate-200 cursor-pointer hover:shadow-xl transition-all group overflow-hidden"
              onClick={() => navigate(createPageUrl("Home") + `?theme=${world.id}`)}
            >
              <div className={`h-32 bg-gradient-to-br ${world.color} flex items-center justify-center`}>
                <Icon className="w-16 h-16 text-white opacity-90" />
              </div>
              <CardHeader>
                <CardTitle className="text-xl group-hover:text-blue-600 transition-colors">
                  {world.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 text-sm">
                  <div>
                    <span className="text-slate-600">Polls: </span>
                    <span className="font-semibold">{stats.pollCount}</span>
                  </div>
                  <div>
                    <span className="text-slate-600">Votes: </span>
                    <span className="font-semibold">{stats.votes}</span>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {world.topics.map((topic) => (
                    <Badge key={topic} variant="secondary" className="text-xs">
                      {topic}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}