import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

export default function EmbedWidget() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  const { data: petition } = useQuery({
    queryKey: ["embed-petition", id],
    queryFn: async () => {
      const { data } = await supabase.from("petitions").select("*").eq("id", id).single();
      return data || null;
    },
    enabled: !!id,
    refetchInterval: 60000,
  });

  if (!petition) return <div className="p-4 text-sm text-slate-500">Petition not found.</div>;
  const count = petition.signature_count_total || 0;
  const goal = petition.signature_goal || 1000;
  const pct = Math.min(100, Math.round((count / Math.max(1, goal)) * 100));

  return (
    <div className="p-4 border rounded-xl bg-white">
      <h2 className="font-semibold text-slate-900 line-clamp-2">{petition.title}</h2>
      <p className="text-xs text-slate-500 mt-1">{count.toLocaleString()} signatures</p>
      <Progress value={pct} className="h-2 mt-2" />
      <Button className="w-full mt-3" onClick={() => window.open(`/PetitionDetail?id=${id}`, "_blank")}>
        Sign this petition
      </Button>
    </div>
  );
}
