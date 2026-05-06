import { useState } from "react";
import { api } from '@/api/client';
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import DonationModal from "./DonationModal";

export default function DonationSection({ pollId, petitionId, user }) {
  const navigate = useNavigate();
  const [showDonateModal, setShowDonateModal] = useState(false);
  const [selectedCharity, setSelectedCharity] = useState(null);

  const { data: linkedCharities = [] } = useQuery({
    queryKey: ["linkedCharities", pollId, petitionId],
    queryFn: async () => {
      try {
        const links = await api.entities.TopicCharityLink.filter(
          pollId ? { poll_id: pollId } : { petition_id: petitionId }
        );
        
        if (links.length === 0) return [];

        const charityIds = links.map((l) => l.charity_id);
        const allCharities = await api.entities.Charity.list();
        return allCharities.filter(
          (c) => charityIds.includes(c.id) && c.status === "approved"
        );
      } catch (error) {
        console.error("Failed to fetch linked charities:", error);
        return [];
      }
    },
    enabled: !!(pollId || petitionId),
  });

  if (linkedCharities.length === 0) return null;

  return (
    <Card className="border-slate-200 bg-gradient-to-br from-pink-50/50 to-red-50/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Heart className="w-5 h-5 text-pink-600" />
          Support This Cause Financially
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {linkedCharities.map((charity) => (
            <div
              key={charity.id}
              className="flex items-center justify-between p-4 bg-white rounded-lg border border-slate-200"
            >
              <div className="flex items-center gap-3">
                {charity.logo_url && (
                  <img
                    src={charity.logo_url}
                    alt={charity.name}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                )}
                <div>
                  <h4 className="font-semibold text-slate-900">{charity.name}</h4>
                  <p className="text-xs text-slate-600">{charity.country}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    navigate(createPageUrl("CharityProfile") + `?id=${charity.id}`)
                  }
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
                {user && (
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-pink-600 to-red-600"
                    onClick={() => {
                      setSelectedCharity(charity);
                      setShowDonateModal(true);
                    }}
                  >
                    <Heart className="w-4 h-4 mr-2" />
                    Donate
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        {showDonateModal && selectedCharity && (
          <DonationModal
            charity={selectedCharity}
            user={user}
            associatedPollId={pollId}
            associatedPetitionId={petitionId}
            onClose={() => {
              setShowDonateModal(false);
              setSelectedCharity(null);
            }}
          />
        )}
      </CardContent>
    </Card>
  );
}