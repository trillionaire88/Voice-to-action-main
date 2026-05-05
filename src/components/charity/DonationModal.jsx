import React, { useState } from "react";
import { api } from '@/api/client';
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Heart, CreditCard, Info } from "lucide-react";
import { toast } from "sonner";

export default function DonationModal({ charity, user, onClose, associatedPollId, associatedPetitionId }) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [customAmount, setCustomAmount] = useState("");

  const presetAmounts = [10, 25, 50, 100];

  const donateMutation = useMutation({
    mutationFn: async (donationAmount) => {
      const donation = await api.entities.Donation.create({
        user_id: user.id,
        charity_id: charity.id,
        amount: parseFloat(donationAmount),
        currency: "USD",
        payment_provider: "stripe",
        payment_status: "pending",
        associated_poll_id: associatedPollId,
        associated_petition_id: associatedPetitionId,
      });

      // Simulate payment success (in production would redirect to payment provider)
      await api.entities.Donation.update(donation.id, {
        payment_status: "succeeded",
        payment_intent_id: `sim_${Date.now()}`,
      });

      await api.entities.Charity.update(charity.id, {
        total_donations_amount:
          (charity.total_donations_amount || 0) + parseFloat(donationAmount),
        donations_count: (charity.donations_count || 0) + 1,
      });

      return donation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["charity"]);
      queryClient.invalidateQueries(["charityDonations"]);
      toast.success("Thank you for your donation!");
      onClose();
    },
    onError: () => {
      toast.error("Donation failed. Please try again.");
    },
  });

  const handleDonate = () => {
    const donationAmount = customAmount || amount;
    if (!donationAmount || parseFloat(donationAmount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    donateMutation.mutate(donationAmount);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-pink-600" />
            Donate to {charity.name}
          </DialogTitle>
        </DialogHeader>

        <Alert className="border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-xs text-blue-800">
            Your donation will be processed securely. Every Voice does not take any fees.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div>
            <Label>Select Amount (USD)</Label>
            <div className="grid grid-cols-4 gap-2 mt-2">
              {presetAmounts.map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  variant={amount === preset.toString() ? "default" : "outline"}
                  onClick={() => {
                    setAmount(preset.toString());
                    setCustomAmount("");
                  }}
                >
                  ${preset}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <Label>Or Custom Amount</Label>
            <Input
              type="number"
              min="1"
              step="0.01"
              placeholder="Enter amount"
              value={customAmount}
              onChange={(e) => {
                setCustomAmount(e.target.value);
                setAmount("");
              }}
              className="mt-2"
            />
          </div>

          <div className="pt-4 border-t border-slate-200">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-600">Donation Amount:</span>
              <span className="font-semibold text-slate-900">
                ${customAmount || amount || "0.00"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Platform Fee:</span>
              <span className="font-semibold text-green-600">$0.00</span>
            </div>
          </div>

          <Button
            className="w-full bg-gradient-to-r from-pink-600 to-red-600 hover:from-pink-700 hover:to-red-700"
            onClick={handleDonate}
            disabled={donateMutation.isPending || (!amount && !customAmount)}
          >
            <CreditCard className="w-4 h-4 mr-2" />
            {donateMutation.isPending ? "Processing..." : "Complete Donation"}
          </Button>

          <p className="text-xs text-slate-500 text-center">
            This is a simulated payment for demo. In production, you'd be redirected to secure
            payment processing.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}