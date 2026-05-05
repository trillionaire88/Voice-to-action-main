import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Heart, CreditCard, Building2, AlertTriangle,
  CheckCircle2, Gift, Copy,
} from "lucide-react";
import { toast } from "sonner";
import { initiateStripeCheckout } from "@/lib/stripeCheckout";

const GIFT_TIERS = [
  { value: "10",  label: "$10"   },
  { value: "25",  label: "$25"   },
  { value: "50",  label: "$50"   },
  { value: "100", label: "$100"  },
  { value: "250", label: "$250"  },
  { value: "custom", label: "Custom" },
];

export default function SupportOwner() {
  const navigate = useNavigate();
  const [user, setUser]               = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("stripe");
  const [selectedTier, setSelectedTier]   = useState("25");
  const [customAmount, setCustomAmount]   = useState("");
  const [giftMessage, setGiftMessage]     = useState("");
  const [confirmed, setConfirmed]         = useState(false);
  const [checkingOut, setCheckingOut]     = useState(false);
  const [showSuccess, setShowSuccess]     = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: authUser } }) => setUser(authUser || null));
    const params = new URLSearchParams(window.location.search);
    if (params.get("gift_sent") === "1" || params.get("donated") === "1") setShowSuccess(true);
  }, []);

  const { data: bankDetails } = useQuery({
    queryKey: ["bankDetails"],
    queryFn: async () => {
      const { data, error } = await supabase.from("platform_config").select("value").eq("key", "owner_bank_details").maybeSingle();
      if (error && (error.code === "42P01" || error.message?.includes("does not exist"))) return null;
      if (data?.value) {
        try { return typeof data.value === "string" ? JSON.parse(data.value) : data.value; } catch {}
      }
      return null;
    },
  });

  const getAmount = () =>
    selectedTier === "custom" ? parseFloat(customAmount) || 0 : parseFloat(selectedTier);

  const handleStripeGift = async () => {
    if (!user) { navigate(createPageUrl("Login")); return; }
    const amount = getAmount();
    if (!amount || amount < 5) { toast.error("Minimum gift amount is $5 AUD"); return; }
    if (!confirmed) { toast.error("Please confirm you understand this is a gift"); return; }
    setCheckingOut(true);
    try {
      await initiateStripeCheckout({
        payment_type: "platform_donation",
        amount,
        success_url: `${window.location.origin}/SupportOwner?donated=1`,
        cancel_url: `${window.location.origin}/SupportOwner?payment_cancelled=1`,
        metadata: { user_id: user.id },
      });
    } catch (err) {
      toast.error(err.message || "Checkout failed");
    } finally {
      setCheckingOut(false);
    }
  };

  const copy = (text) =>
    navigator.clipboard.writeText(text).then(() => toast.success("Copied to clipboard"));

  if (showSuccess) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Heart className="w-10 h-10 text-rose-600" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-4">Thank You for Your Gift</h1>
        <p className="text-slate-600 text-lg mb-8">
          Your generous gift has been received and is deeply appreciated. It helps make EveryVoice possible.
        </p>
        <Button onClick={() => navigate(createPageUrl("Home"))}>Return Home</Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 pb-20">

      {/* Hero */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-rose-100 rounded-full mb-4">
          <Gift className="w-8 h-8 text-rose-600" />
        </div>
        <h1 className="text-4xl font-bold text-slate-900 mb-3">Support the Creator</h1>
        <p className="text-lg text-slate-600 max-w-xl mx-auto">
          If EveryVoice has made a difference in your life or community, you may choose to send a
          voluntary personal gift directly to the platform creator.
        </p>
      </div>

      {/* ⚠️ Legal / Gift Notice */}
      <Alert className="border-amber-300 bg-amber-50 mb-8">
        <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <AlertDescription className="text-amber-900">
          <strong className="text-base block mb-2">⚠️ This is a Voluntary Personal Gift — Not a Purchase or Donation</strong>
          <ul className="space-y-1.5 text-sm">
            <li>• You are sending a <strong>personal gift</strong> to Every Voice Pty Ltd as a completely voluntary act.</li>
            <li>• <strong>No goods, services, subscriptions, refunds, or platform benefits</strong> are provided in exchange.</li>
            <li>• <strong>All gifts are strictly non-refundable.</strong> This is not a donation to a charity or registered NFP.</li>
            <li>• Gifts do not confer any ownership, voting influence, or special status on the platform.</li>
            <li>• This is a private, voluntary transaction between you and Every Voice Pty Ltd.</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* Payment Method Toggle */}
      <div className="flex rounded-xl border border-slate-200 p-1 mb-8 bg-slate-50">
        <button
          onClick={() => setPaymentMethod("stripe")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition-all ${
            paymentMethod === "stripe"
              ? "bg-white shadow text-slate-900"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <CreditCard className="w-4 h-4" /> Pay via Card (Stripe)
        </button>
        <button
          onClick={() => setPaymentMethod("bank")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition-all ${
            paymentMethod === "bank"
              ? "bg-white shadow text-slate-900"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <Building2 className="w-4 h-4" /> Direct Bank Transfer
        </button>
      </div>

      {/* ── STRIPE OPTION ───────────────────────────────────── */}
      {paymentMethod === "stripe" && (
        <Card className="border-slate-200 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-600" />
              Send a Gift via Card
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Amount selection */}
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-3">
                Select Gift Amount (AUD)
              </label>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                {GIFT_TIERS.map((tier) => (
                  <Button
                    key={tier.value}
                    type="button"
                    variant={selectedTier === tier.value ? "default" : "outline"}
                    onClick={() => setSelectedTier(tier.value)}
                    className="w-full"
                  >
                    {tier.label}
                  </Button>
                ))}
              </div>
              {selectedTier === "custom" && (
                <div className="mt-3">
                  <Input
                    type="number"
                    placeholder="Enter amount (min $5 AUD)"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    min="5"
                    step="1"
                  />
                </div>
              )}
            </div>

            {/* Gift message */}
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-2">
                Personal Message (optional)
              </label>
              <textarea
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm h-20 resize-none focus:outline-none focus:ring-2 focus:ring-rose-200"
                placeholder="Include a personal message with your gift..."
                value={giftMessage}
                onChange={(e) => setGiftMessage(e.target.value)}
                maxLength={200}
              />
              <p className="text-xs text-slate-400 mt-1">{giftMessage.length}/200</p>
            </div>

            {/* Referral Code — not applicable to creator gifts */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 block">
                Referral Code (optional)
              </label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  disabled
                  readOnly
                  className="flex-1 font-mono uppercase tracking-widest bg-white text-slate-900 border-slate-300 placeholder:text-slate-400"
                  placeholder="Referral codes not used for gifts"
                />
                <Button type="button" variant="outline" disabled className="shrink-0">
                  Not applicable for donations
                </Button>
              </div>
              <p className="text-xs text-amber-700 mt-1">
                Referral codes cannot be applied to donations or gifts to the creator.
              </p>
            </div>

            {/* Confirmation checkbox */}
            <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <input
                type="checkbox"
                id="gift-confirm"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 w-4 h-4 cursor-pointer accent-rose-600"
              />
              <label htmlFor="gift-confirm" className="text-sm text-slate-700 cursor-pointer leading-relaxed">
                I confirm I am voluntarily sending this as a <strong>personal gift</strong> to the platform creator.
                I understand it is <strong>non-refundable</strong> and that no goods, services, or platform
                benefits are provided in exchange.
              </label>
            </div>

            <Button
              onClick={handleStripeGift}
              disabled={!confirmed || checkingOut || !user || getAmount() < 5}
              className="w-full bg-rose-600 hover:bg-rose-700 text-white h-12 text-base font-semibold"
            >
              {checkingOut ? (
                "Redirecting to Stripe..."
              ) : !user ? (
                "Sign In to Send Gift"
              ) : (
                <>
                  <Heart className="w-5 h-5 mr-2" />
                  Send Gift of ${getAmount() || 0} AUD
                </>
              )}
            </Button>

            {!user && (
              <Button variant="outline" onClick={() => navigate(createPageUrl("Login"))} className="w-full">
                Sign In to Continue
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── BANK TRANSFER OPTION ────────────────────────────── */}
      {paymentMethod === "bank" && (
        <Card className="border-slate-200 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-600" />
              Direct Bank Transfer
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bankDetails ? (
              <div className="space-y-4">
                <p className="text-sm text-slate-600">
                  Transfer your gift directly to the following Australian bank account.
                  Please include your name and <strong>"GIFT"</strong> in the payment reference.
                </p>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <DetailRow label="Account Name" value={bankDetails.account_name} onCopy={copy} />
                  <Separator />
                  <DetailRow label="BSB" value={bankDetails.bsb} mono onCopy={copy} />
                  <Separator />
                  <DetailRow label="Account Number" value={bankDetails.account_number} mono onCopy={copy} />
                  {bankDetails.payment_reference_instructions && (
                    <>
                      <Separator />
                      <div>
                        <span className="text-sm text-slate-500 block mb-1">Reference Instructions</span>
                        <p className="text-sm text-slate-700">{bankDetails.payment_reference_instructions}</p>
                      </div>
                    </>
                  )}
                </div>

                <Alert className="border-blue-200 bg-blue-50">
                  <AlertDescription className="text-blue-900 text-sm">
                    <strong>After transferring:</strong> Include <strong>"GIFT"</strong> and your name in the
                    transfer description so your gift can be acknowledged. No further notification is needed —
                    bank transfers are received automatically.
                  </AlertDescription>
                </Alert>

                <Alert className="border-amber-200 bg-amber-50">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-900 text-sm">
                    This is a <strong>voluntary personal gift</strong>. Bank transfers are non-refundable.
                    Please only proceed if you have read and accepted the gift terms above.
                  </AlertDescription>
                </Alert>
              </div>
            ) : (
              <div className="text-center py-10 text-slate-500">
                <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-medium">Bank transfer details are not currently configured.</p>
                <p className="text-xs mt-1 text-slate-400">
                  Please use the Stripe card option, or contact the platform creator directly at{" "}
                  <a href="mailto:jeremy@everyvoice.com" className="text-blue-600 underline">jeremy@everyvoice.com</a>.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Footer legal note */}
      <p className="text-xs text-slate-400 text-center leading-relaxed mt-4">
        By sending a gift, you acknowledge this is a voluntary personal transaction between you and
        Every Voice Pty Ltd.
        All gifts are final and non-refundable. For queries, contact{" "}
        <a href="mailto:jeremy@everyvoice.com" className="underline">jeremy@everyvoice.com</a>.
      </p>
    </div>
  );
}

function DetailRow({ label, value, mono, onCopy }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm text-slate-500 flex-shrink-0">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`font-semibold text-slate-900 ${mono ? "font-mono" : ""}`}>{value}</span>
        <button
          onClick={() => onCopy(value)}
          className="text-slate-400 hover:text-slate-600 transition-colors"
          title="Copy"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}