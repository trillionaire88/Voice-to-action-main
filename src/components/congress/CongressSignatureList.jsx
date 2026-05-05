import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";

/**
 * Displays petition signers with privacy-first approach.
 * Shows: First name + Verified status only
 * Hides: Email, full name, location, and other private details
 */
export default function CongressSignatureList({ signatures }) {
  if (!signatures || signatures.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-slate-600">
          No signatures yet
        </CardContent>
      </Card>
    );
  }

  // Filter and process for privacy
  const processedSignatures = signatures
    .filter(s => !s.is_invalidated && !s.has_withdrawn && s.is_email_confirmed)
    .map(sig => {
      const firstName = sig.signer_name.split(' ')[0];
      return {
        id: sig.id,
        firstName,
        isVerified: sig.is_verified_user,
        signedAt: sig.confirmed_at,
      };
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Verified Signatories ({processedSignatures.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {processedSignatures.map((sig, idx) => (
            <div
              key={sig.id}
              className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg text-sm"
            >
              <div className="flex items-center gap-2">
                <span className="text-slate-600">
                  {idx + 1}. {sig.firstName}
                </span>
                {sig.isVerified && (
                  <Badge className="h-5 bg-emerald-50 text-emerald-700 border-emerald-200 px-2 text-xs">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Verified
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-200">
          Privacy Notice: Only first names and verification status are displayed to protect signer privacy.
        </div>
      </CardContent>
    </Card>
  );
}