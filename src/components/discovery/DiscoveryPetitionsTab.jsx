import React from "react";
import { api } from '@/api/client';
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Skeleton } from "@/components/ui/skeleton";
import PetitionCard from "@/components/petitions/PetitionCard";
import VirtualFeed from "@/components/ui/VirtualFeed";

export default function DiscoveryPetitionsTab({ searchQuery, filters, user }) {
  const navigate = useNavigate();

  const { data: petitions = [], isLoading } = useQuery({
    queryKey: ["discovery-petitions", filters, searchQuery],
    queryFn: async () => {
      let all = await api.entities.Petition.filter({ status: "open" }, "-signature_count_total", 100);
      if (filters.category && filters.category !== "all") all = all.filter(p => p.category === filters.category);
      if (filters.verifiedOnly) all = all.filter(p => p.is_verified);
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        all = all.filter(p => (p.title || "").toLowerCase().includes(q) || (p.short_summary || "").toLowerCase().includes(q));
      }
      return all;
    },
  });

  const { data: mySigs = [] } = useQuery({
    queryKey: ["my-signatures", user?.id],
    queryFn: () => api.entities.PetitionSignature.filter({ user_id: user.id }),
    enabled: !!user,
  });
  const signedIds = new Set(mySigs.map(s => s.petition_id));

  if (isLoading) return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
    </div>
  );

  if (petitions.length === 0) return (
    <div className="text-center py-16 text-slate-400">
      <div className="text-4xl mb-3">📜</div>
      <p className="font-medium">No petitions found</p>
      <p className="text-sm mt-1">Try adjusting your filters</p>
    </div>
  );

  return (
    <VirtualFeed
      items={petitions}
      columns={2}
      rowHeight={280}
      threshold={20}
      gridClassName="grid grid-cols-1 md:grid-cols-2 gap-4"
      renderItem={({ item: petition }) => (
        <PetitionCard
          petition={petition}
          hasSigned={signedIds.has(petition.id)}
          onClick={() => navigate(createPageUrl("PetitionDetail") + `?id=${petition.id}`)}
        />
      )}
    />
  );
}