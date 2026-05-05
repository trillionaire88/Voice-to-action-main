import React, { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { BookOpen, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";

export default function PollLiteracyPanel({ poll, biasWarning }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Alert className="border-blue-200 bg-blue-50 mb-6">
      <div className="flex items-start gap-3">
        <BookOpen className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-blue-900">How to Interpret This Poll</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="text-blue-700 hover:text-blue-800 hover:bg-blue-100"
            >
              {expanded ? (
                <>
                  <ChevronUp className="w-4 h-4 mr-1" />
                  Less
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 mr-1" />
                  More
                </>
              )}
            </Button>
          </div>
          
          <AlertDescription className="text-sm text-blue-800 leading-relaxed">
            <p className="mb-2">
              This poll reflects opinions from <strong>Voice to Action users</strong>, not a scientifically
              representative sample of the global population.
            </p>
            
            {biasWarning && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg mb-2">
                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-amber-900">
                  <strong>Sample Bias Detected:</strong> {biasWarning}
                  <br />
                  <span className="text-amber-800">
                    This may not represent global opinion. Consider demographic distribution carefully.
                  </span>
                </div>
              </div>
            )}

            {expanded && (
              <div className="mt-3 space-y-2 text-blue-800">
                <p>
                  <strong>Key Points:</strong>
                </p>
                <ul className="ml-6 space-y-1 list-disc">
                  <li>
                    <strong>Sample Size Matters:</strong> Larger samples (more votes) are generally more reliable,
                    but still reflect only platform users.
                  </li>
                  <li>
                    <strong>Self-Selection Bias:</strong> People who choose to vote may have stronger opinions
                    than the general population.
                  </li>
                  <li>
                    <strong>Geographic Distribution:</strong> Check the demographics tab to see which countries
                    are represented. Results may be skewed toward specific regions.
                  </li>
                  <li>
                    <strong>Verification Status:</strong> Verified votes come from users who have confirmed their
                    identity, providing an additional trust signal.
                  </li>
                  <li>
                    <strong>Not Legally Binding:</strong> These results are expressions of opinion, not official
                    referendums or policy decisions.
                  </li>
                </ul>
                <p className="pt-2">
                  <strong>Use polls as conversation starters</strong> rather than definitive answers. Cross-reference
                  with other sources and expert analysis for important topics.
                </p>
              </div>
            )}
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
}