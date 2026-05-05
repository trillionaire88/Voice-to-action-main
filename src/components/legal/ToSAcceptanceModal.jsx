import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, AlertTriangle, FileText } from "lucide-react";
import { toast } from "sonner";
import ToSContent, { CURRENT_TOS_VERSION } from "./ToSContent";

export default function ToSAcceptanceModal({ user, onAccepted, onDecline }) {
  const [hasRead, setHasRead] = useState(false);
  const [hasAgreed, setHasAgreed] = useState(false);
  const [showFullToS, setShowFullToS] = useState(false);

  const acceptMutation = useMutation({
    mutationFn: async () => {
      // Actual persistence is handled by `ToSGate` in the background.
      // Returning successfully allows the UI to proceed even if persistence fails.
      onAccepted();
    },
    onSuccess: () => {
      toast.success("Terms accepted");
    },
    onError: () => {
      toast.error("Failed to record acceptance");
      // Never block the app if saving fails — `ToSGate` already set localStorage.
    },
  });

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Shield className="w-6 h-6 text-blue-600" />
            Terms of Service Agreement
          </DialogTitle>
          <DialogDescription>
            Please review and accept our Terms of Service to continue using Voice to Action
          </DialogDescription>
        </DialogHeader>

        {!showFullToS ? (
          <div className="space-y-4">
            <Alert className="border-blue-200 bg-blue-50">
              <FileText className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-sm text-blue-800">
                Voice to Action requires all users to accept our Terms of Service. This includes critical 
                intellectual property protections and community guidelines.
              </AlertDescription>
            </Alert>

            <ScrollArea className="h-64 border border-slate-200 rounded-lg p-4 bg-slate-50">
              <div className="space-y-3 text-sm text-slate-700">
                <p><strong>Key Points:</strong></p>
                <ul className="list-disc ml-5 space-y-1">
                  <li>Voice to Action platform and all its features are protected intellectual property</li>
                  <li>Copying, cloning, or replicating the platform is strictly prohibited</li>
                  <li>Users must provide accurate identity information</li>
                  <li>Content must follow community guidelines (no hate speech, harassment, etc.)</li>
                  <li>AI systems are used for moderation and classification</li>
                  <li>Data is encrypted and privacy-protected</li>
                  <li>Platform provided "as-is" without guarantees</li>
                  <li>Governed by laws of Australia</li>
                </ul>
              </div>
            </ScrollArea>

            <Button
              variant="outline"
              onClick={() => setShowFullToS(true)}
              className="w-full"
            >
              <FileText className="w-4 h-4 mr-2" />
              Read Full Terms of Service
            </Button>

            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="read-confirm"
                  checked={hasRead}
                  onCheckedChange={setHasRead}
                />
                <label
                  htmlFor="read-confirm"
                  className="text-sm text-slate-700 cursor-pointer"
                >
                  I have read and understood the key points above
                </label>
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="agree-confirm"
                  checked={hasAgreed}
                  onCheckedChange={setHasAgreed}
                  disabled={!hasRead}
                />
                <label
                  htmlFor="agree-confirm"
                  className="text-sm font-semibold text-slate-900 cursor-pointer"
                >
                  I agree to be legally bound by the Terms of Service (Version {CURRENT_TOS_VERSION})
                </label>
              </div>
            </div>

            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-xs text-red-800">
                <strong>Warning:</strong> By accepting, you acknowledge that violating intellectual property 
                protections (including copying or cloning Voice to Action) will result in immediate legal action.
              </AlertDescription>
            </Alert>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={onDecline}
                className="flex-1"
              >
                Decline & Exit
              </Button>
              <Button
                onClick={() => acceptMutation.mutate()}
                disabled={!hasRead || !hasAgreed || acceptMutation.isPending}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {acceptMutation.isPending ? "Recording..." : "Accept & Continue"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <ScrollArea className="h-96 border border-slate-200 rounded-lg p-6 bg-white">
              <ToSContent />
            </ScrollArea>
            <Button
              variant="outline"
              onClick={() => setShowFullToS(false)}
              className="w-full"
            >
              Back to Summary
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}