import React, { useState } from "react";
import { api } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Star, Award } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = [
  { value: "constructive", label: "Constructive" },
  { value: "respectful", label: "Respectful" },
  { value: "well_reasoned", label: "Well-reasoned" },
];

export default function UserRatingPanel({ targetUser, currentUser }) {
  const queryClient = useQueryClient();
  const [category, setCategory] = useState("constructive");
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);

  const { data: existingRating } = useQuery({
    queryKey: ["myRating", targetUser.id, currentUser.id, category],
    queryFn: async () => {
      const ratings = await api.entities.UserReputationRating.filter({
        rater_user_id: currentUser.id,
        target_user_id: targetUser.id,
        category,
      });
      return ratings.length > 0 ? ratings[0] : null;
    },
  });

  React.useEffect(() => {
    if (existingRating) {
      setRating(existingRating.value);
    } else {
      setRating(0);
    }
  }, [existingRating, category]);

  const rateMutation = useMutation({
    mutationFn: async (value) => {
      if (existingRating) {
        await api.entities.UserReputationRating.update(existingRating.id, {
          value,
        });
      } else {
        await api.entities.UserReputationRating.create({
          rater_user_id: currentUser.id,
          target_user_id: targetUser.id,
          category,
          value,
        });
      }
      /* Profile reputation_* columns updated by DB trigger (user_reputation_aggregate_trigger.sql). */
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["myRating"]);
      queryClient.invalidateQueries(["user", targetUser.id]);
      toast.success("Rating submitted!");
    },
    onError: () => {
      toast.error("Failed to submit rating");
    },
  });

  const handleStarClick = (value) => {
    setRating(value);
    rateMutation.mutate(value);
  };

  return (
    <Card className="border-slate-200 shadow-sm mb-6">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-500" />
          Rate {targetUser.display_name}'s Contributions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-sm font-medium mb-2 block">Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-sm font-medium mb-2 block">Your Rating</Label>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => handleStarClick(value)}
                onMouseEnter={() => setHoveredRating(value)}
                onMouseLeave={() => setHoveredRating(0)}
                className="focus:outline-none transition-transform hover:scale-110"
                disabled={rateMutation.isPending}
              >
                <Star
                  className={`w-8 h-8 ${
                    value <= (hoveredRating || rating)
                      ? "fill-amber-400 text-amber-400"
                      : "text-slate-300"
                  }`}
                />
              </button>
            ))}
            {rating > 0 && (
              <span className="ml-2 text-sm font-medium text-slate-700">
                {rating}/5
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Rate this user's contributions in the selected category
          </p>
        </div>
      </CardContent>
    </Card>
  );
}