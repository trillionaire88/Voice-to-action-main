import { useState } from "react";
import { api } from '@/api/client';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { FileText, X, ArrowRight, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

/**
 * CommunityPetitionNotification
 * Shows a single endorsement notification card for a community member.
 * Props:
 *   endorsement - CommunityPetitionEndorsement record
 *   userId      - current user id
 *   onResponded - callback when user responds (agree or dismiss)
 */
export default function CommunityPetitionNotification({ endorsement, userId, onResponded }) {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const recordResponse = async (response) => {
    setLoading(true);
    await api.entities.CommunityPetitionResponse.create({
      endorsement_id: endorsement.id,
      community_id: endorsement.community_id,
      user_id: userId,
      response,
    });
    setLoading(false);
  };

  const handleDismiss = async () => {
    await recordResponse("dismiss");
    onResponded(endorsement.id);
  };

  const handleAgree = async () => {
    await recordResponse("agree");
    setShowModal(true);
  };

  const handleViewPetition = () => {
    setShowModal(false);
    onResponded(endorsement.id);
    navigate(createPageUrl("PetitionDetail") + `?id=${endorsement.petition_id}`);
  };

  return (
    <>
      <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
        <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
          <FileText className="w-4 h-4 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 mb-0.5">Your community endorsed a petition</p>
          <p className="text-sm text-slate-600 line-clamp-2">{endorsement.petition_title}</p>
          {endorsement.petition_summary && (
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{endorsement.petition_summary}</p>
          )}
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              onClick={handleAgree}
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-xs px-3"
            >
              <CheckCircle2 className="w-3 h-3 mr-1" /> Agree
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDismiss}
              disabled={loading}
              className="text-slate-500 h-7 text-xs px-3"
            >
              <X className="w-3 h-3 mr-1" /> Dismiss
            </Button>
          </div>
        </div>
      </div>

      {/* Agree modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              You support this petition
            </DialogTitle>
            <DialogDescription>
              Your agreement has been recorded. Would you like to view the full petition and sign it?
            </DialogDescription>
          </DialogHeader>
          <div className="bg-slate-50 rounded-lg p-4 my-2">
            <p className="font-semibold text-slate-900 text-sm mb-1">{endorsement.petition_title}</p>
            {endorsement.petition_summary && (
              <p className="text-slate-600 text-xs leading-relaxed">{endorsement.petition_summary}</p>
            )}
          </div>
          <div className="flex gap-3">
            <Button onClick={handleViewPetition} className="flex-1 bg-blue-600 hover:bg-blue-700">
              View &amp; Sign Petition <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button variant="outline" onClick={() => { setShowModal(false); onResponded(endorsement.id); }}>
              Maybe later
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}