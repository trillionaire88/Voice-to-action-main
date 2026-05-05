import React, { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";
import VerificationGate from "@/components/auth/VerificationGate";
import { cn } from "@/lib/utils";
import ActionButton from "@/components/ui/ActionButton";

export default function VotingInterface({ options, onVote, isLoading, user, poll }) {
  const [selectedOption, setSelectedOption] = useState(null);
  const requireFullVerification = !!poll?.verified_only;

  const handleVote = useCallback(() => {
    if (selectedOption) onVote(selectedOption);
  }, [selectedOption, onVote]);

  return (
    <VerificationGate user={user} requireFullVerification={requireFullVerification} action="vote">
      <Card className="border-slate-200 shadow-sm">
        <CardHeader><CardTitle className="text-xl">Cast Your Vote</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <fieldset>
            <legend className="sr-only">Select an option to vote</legend>
            <div className="space-y-3">
              {options.map((option) => {
                const isSelected = selectedOption === option.id;
                return (
                  <label
                    key={option.id}
                    className={cn(
                      "flex items-center gap-3 w-full text-left p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 select-none active:scale-[0.98]",
                      isSelected ? "border-blue-500 bg-blue-50" : "border-slate-200 active:border-blue-300 active:bg-slate-50"
                    )}
                    style={{ WebkitTapHighlightColor: "transparent" }}
                  >
                    <input
                      type="radio"
                      name="vote-option"
                      value={option.id}
                      checked={isSelected}
                      onChange={() => setSelectedOption(option.id)}
                      className="sr-only"
                      aria-label={option.option_text}
                    />
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all",
                      isSelected ? "border-blue-500 bg-blue-500" : "border-slate-300"
                    )}>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <span className="font-medium text-slate-900 select-none">{option.option_text}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
          <ActionButton
            onClick={handleVote}
            disabled={!selectedOption || isLoading}
            loading={isLoading}
            loadingText="Submitting..."
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 h-12 text-base"
            aria-busy={isLoading}
          >
            Submit Vote
          </ActionButton>
        </CardContent>
      </Card>
    </VerificationGate>
  );
}