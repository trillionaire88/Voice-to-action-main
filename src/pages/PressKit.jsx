import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

export default function PressKit() {
  const { data: stats = { users: 0, petitions: 0, signatures: 0, countries: 0 } } = useQuery({
    queryKey: ["press-kit-stats"],
    queryFn: async () => {
      try {
        const [{ count: users }, { count: petitions }, { count: signatures }, { data: profiles = [] }] = await Promise.all([
          supabase.from("public_profiles_view").select("*", { count: "exact", head: true }),
          supabase.from("petitions").select("*", { count: "exact", head: true }),
          supabase.from("signatures").select("*", { count: "exact", head: true }),
          supabase.from("public_profiles_view").select("country_code").limit(5000),
        ]);
        return { users: users || 0, petitions: petitions || 0, signatures: signatures || 0, countries: new Set((profiles || []).map((p) => p.country_code).filter(Boolean)).size };
      } catch {
        return { users: 0, petitions: 0, signatures: 0, countries: 0 };
      }
    },
  });

  return (
    <>
      <h1 className="text-3xl font-bold">Voice to Action Press Kit</h1>
      <p className="text-slate-600 mt-2">Global civic accountability platform.</p>
      <div className="grid md:grid-cols-4 gap-4 mt-6">
        <div className="p-4 border rounded">Users: {stats.users.toLocaleString()}</div>
        <div className="p-4 border rounded">Petitions: {stats.petitions.toLocaleString()}</div>
        <div className="p-4 border rounded">Signatures: {stats.signatures.toLocaleString()}</div>
        <div className="p-4 border rounded">Countries: {stats.countries}</div>
      </div>
      <div className="mt-6 space-y-2">
        <p>Primary colour: #2563eb</p>
        <p>Press contact: press@voicetoaction.io</p>
        <a href="mailto:press@voicetoaction.io"><Button>Request an interview</Button></a>
      </div>
    </>
  );
}
