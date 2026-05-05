import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { initiateStripeCheckout } from "@/lib/stripeCheckout";
import { toast } from "sonner";

export default function PromoteContent() {
  const [amount, setAmount] = useState(10);
  return (
    <>
      <h1 className="text-3xl font-bold mb-4">Promote Content</h1>
      <p className="text-slate-600 mb-3">Minimum $10 AUD per day.</p>
      <Input type="number" min={10} value={amount} onChange={(e) => setAmount(Number(e.target.value || 10))} />
      <Button
        className="mt-3"
        onClick={async () => {
          try {
            await initiateStripeCheckout({ payment_type: "content_promotion", amount });
          } catch (e) {
            toast.error(e.message || "Payment failed");
          }
        }}
      >
        Boost Now
      </Button>
    </>
  );
}
