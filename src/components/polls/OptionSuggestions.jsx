import React, { useState } from "react";
import { api } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, Check, X, Clock } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export default function OptionSuggestions({ pollId, isCreator, user }) {
  const queryClient = useQueryClient();
  const [suggestionText, setSuggestionText] = useState("");
  const [showForm, setShowForm] = useState(false);

  const { data: suggestions = [] } = useQuery({
    queryKey: ["pollSuggestions", pollId],
    queryFn: () =>
      api.entities.PollOptionSuggestion.filter(
        { poll_id: pollId },
        "-created_date"
      ),
  });

  const createSuggestionMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Must be logged in");
      return await api.entities.PollOptionSuggestion.create({
        poll_id: pollId,
        suggester_user_id: user.id,
        option_text: suggestionText,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["pollSuggestions", pollId]);
      setSuggestionText("");
      setShowForm(false);
      toast.success("Option suggested!");
    },
    onError: () => {
      toast.error("Failed to suggest option");
    },
  });

  const handleSuggestionDecisionMutation = useMutation({
    mutationFn: async ({ suggestionId, status, suggestion }) => {
      await api.entities.PollOptionSuggestion.update(suggestionId, {
        status,
        decided_at: new Date().toISOString(),
      });

      if (status === "accepted") {
        // Get current options to determine order
        const options = await api.entities.PollOption.filter({
          poll_id: pollId,
        });
        const maxOrder = Math.max(...options.map((o) => o.order_index || 0), -1);

        await api.entities.PollOption.create({
          poll_id: pollId,
          option_text: suggestion.option_text,
          order_index: maxOrder + 1,
        });
      }
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries(["pollSuggestions", pollId]);
      queryClient.invalidateQueries(["pollOptions", pollId]);
      toast.success(
        status === "accepted" ? "Option added!" : "Suggestion rejected"
      );
    },
    onError: () => {
      toast.error("Failed to process suggestion");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!suggestionText.trim()) {
      toast.error("Please enter an option");
      return;
    }
    createSuggestionMutation.mutate();
  };

  const pendingSuggestions = suggestions.filter((s) => s.status === "pending");

  if (!user) return null;

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-amber-500" />
          Suggested Options
          {pendingSuggestions.length > 0 && (
            <Badge className="bg-amber-50 text-amber-700 border-amber-200">
              {pendingSuggestions.length} pending
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Creator View: Manage Suggestions */}
        {isCreator && pendingSuggestions.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Users have suggested additional options for your poll:
            </p>
            {pendingSuggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900">
                    {suggestion.option_text}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Suggested{" "}
                    {formatDistanceToNow(new Date(suggestion.created_date), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
                <div className="flex gap-2 ml-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      handleSuggestionDecisionMutation.mutate({
                        suggestionId: suggestion.id,
                        status: "accepted",
                        suggestion,
                      })
                    }
                    disabled={handleSuggestionDecisionMutation.isPending}
                    className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      handleSuggestionDecisionMutation.mutate({
                        suggestionId: suggestion.id,
                        status: "rejected",
                        suggestion,
                      })
                    }
                    disabled={handleSuggestionDecisionMutation.isPending}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Non-Creator View: Suggest Option */}
        {!isCreator && (
          <>
            {!showForm ? (
              <Button
                variant="outline"
                onClick={() => setShowForm(true)}
                className="w-full"
              >
                <Lightbulb className="w-4 h-4 mr-2" />
                Suggest an Option
              </Button>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <Input
                  placeholder="Your suggested option..."
                  value={suggestionText}
                  onChange={(e) => setSuggestionText(e.target.value)}
                  maxLength={100}
                />
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={createSuggestionMutation.isPending}
                    size="sm"
                  >
                    Submit
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowForm(false);
                      setSuggestionText("");
                    }}
                    size="sm"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}

            {/* Show user's suggestions */}
            {suggestions
              .filter((s) => s.suggester_user_id === user.id)
              .map((suggestion) => (
                <div
                  key={suggestion.id}
                  className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900">
                      {suggestion.option_text}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Your suggestion •{" "}
                      {formatDistanceToNow(new Date(suggestion.created_date), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                  <Badge
                    className={
                      suggestion.status === "pending"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : suggestion.status === "accepted"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-slate-50 text-slate-700 border-slate-200"
                    }
                  >
                    {suggestion.status === "pending" && (
                      <Clock className="w-3 h-3 mr-1" />
                    )}
                    {suggestion.status === "accepted" && (
                      <Check className="w-3 h-3 mr-1" />
                    )}
                    {suggestion.status === "rejected" && (
                      <X className="w-3 h-3 mr-1" />
                    )}
                    {suggestion.status}
                  </Badge>
                </div>
              ))}
          </>
        )}
      </CardContent>
    </Card>
  );
}