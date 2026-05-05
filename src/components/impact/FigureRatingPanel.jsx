import React, { useState } from "react";
import { api } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function FigureRatingPanel({ figure, user }) {
  const queryClient = useQueryClient();
  const [trustworthiness, setTrustworthiness] = useState(3);
  const [ethicalConduct, setEthicalConduct] = useState(3);
  const [transparency, setTransparency] = useState(3);
  const [overallImpact, setOverallImpact] = useState("neutral");
  const [comment, setComment] = useState("");

  const { data: myRating } = useQuery({
    queryKey: ["myFigureRating", figure.id, user.id],
    queryFn: async () => {
      const ratings = await api.entities.FigureRating.filter({
        figure_id: figure.id,
        user_id: user.id,
      });
      return ratings.length > 0 ? ratings[0] : null;
    },
  });

  React.useEffect(() => {
    if (myRating) {
      setTrustworthiness(myRating.trustworthiness);
      setEthicalConduct(myRating.ethical_conduct);
      setTransparency(myRating.transparency);
      setOverallImpact(myRating.overall_impact);
      setComment(myRating.comment || "");
    }
  }, [myRating]);

  const rateMutation = useMutation({
    mutationFn: async () => {
      const ratingData = {
        figure_id: figure.id,
        user_id: user.id,
        trustworthiness,
        ethical_conduct: ethicalConduct,
        transparency,
        overall_impact: overallImpact,
        comment: comment.trim(),
      };

      if (myRating) {
        await api.entities.FigureRating.update(myRating.id, ratingData);
      } else {
        await api.entities.FigureRating.create(ratingData);
      }
      /* Aggregates on public_figures are recalculated by DB trigger (figure_rating_aggregate_trigger.sql). */
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["myFigureRating"]);
      queryClient.invalidateQueries(["publicFigure"]);
      queryClient.invalidateQueries(["figureRatings"]);
      toast.success("Rating submitted!");
    },
    onError: () => {
      toast.error("Failed to submit rating");
    },
  });

  return (
    <Card className="border-blue-200 bg-blue-50/50 mb-6">
      <CardHeader>
        <CardTitle className="text-lg">Rate This Public Figure</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label className="text-sm mb-2 block">Trustworthiness</Label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setTrustworthiness(val)}
                  className="focus:outline-none transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-6 h-6 ${
                      val <= trustworthiness
                        ? "fill-amber-400 text-amber-400"
                        : "text-slate-300"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-sm mb-2 block">Ethical Conduct</Label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setEthicalConduct(val)}
                  className="focus:outline-none transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-6 h-6 ${
                      val <= ethicalConduct
                        ? "fill-amber-400 text-amber-400"
                        : "text-slate-300"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-sm mb-2 block">Transparency</Label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setTransparency(val)}
                  className="focus:outline-none transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-6 h-6 ${
                      val <= transparency
                        ? "fill-amber-400 text-amber-400"
                        : "text-slate-300"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <Label className="text-sm mb-2 block">Overall Impact</Label>
          <Select value={overallImpact} onValueChange={setOverallImpact}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="very_negative">Very Negative</SelectItem>
              <SelectItem value="negative">Negative</SelectItem>
              <SelectItem value="neutral">Neutral</SelectItem>
              <SelectItem value="positive">Positive</SelectItem>
              <SelectItem value="very_positive">Very Positive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-sm mb-2 block">Comment (Optional)</Label>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your thoughts..."
            rows={3}
          />
        </div>

        <Button
          onClick={() => rateMutation.mutate()}
          disabled={rateMutation.isPending}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          {myRating ? "Update Rating" : "Submit Rating"}
        </Button>
      </CardContent>
    </Card>
  );
}