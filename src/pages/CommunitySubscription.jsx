import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { cancelCommunitySubscription } from "@/api/communityApi";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { initiateStripeCheckout } from "@/lib/stripeCheckout";

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: null,
    badge: null,
    color: "border-slate-200",
    features: [
      "Public community page",
      "Unlimited discussions and posts",
      "Polls and petitions",
      "Single admin",
      "Standard search visibility",
    ],
  },
  {
    id: "paid",
    name: "Paid",
    price: "$19.99",
    badge: "Popular",
    color: "border-blue-400",
    features: [
      "Everything in Free",
      "Verified badge on community",
      "Analytics dashboard",
      "Multiple admins",
      "Priority in search results",
    ],
  },
  {
    id: "private",
    name: "Private",
    price: "$19.99",
    badge: null,
    color: "border-slate-400",
    features: [
      "Everything in Paid",
      "Hidden from public search",
      "Access by invite code only",
      "Internal-only discussions",
      "If cancelled — community pauses, not deleted",
    ],
  },
];

export default function CommunitySubscription() {
  const [searchParams] = useSearchParams();
  const communityId = searchParams.get("community_id");
  const [community, setCommunity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  useEffect(() => {
    if (communityId) loadCommunity();
    else setLoading(false);
  }, [communityId]);

  const loadCommunity = async () => {
    if (!communityId) return;
    const { data } = await supabase.from("communities").select("*").eq("id", communityId).single();
    setCommunity(data);
    setLoading(false);
  };

  const handleUpgrade = async (plan) => {
    if (plan === "free" || !communityId) return;
    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await initiateStripeCheckout({
        payment_type: "community_subscription",
        success_url: `${window.location.origin}/CommunitySubscription?subscribed=1&community_id=${communityId}`,
        cancel_url: `${window.location.origin}/CommunitySubscription?community_id=${communityId}&payment_cancelled=1`,
        metadata: { user_id: user?.id || "" },
      });
    } catch (err) {
      toast.error(err.message || "Failed to start subscription");
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (!communityId) return;
    setProcessing(true);
    try {
      const message = await cancelCommunitySubscription(communityId);
      toast.success(message);
      setShowCancelConfirm(false);
      loadCommunity();
    } catch (err) {
      toast.error(err.message || "Failed to cancel subscription");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!communityId) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center text-slate-600">
        <p>Missing community. Open this page from your community&apos;s &quot;Manage plan&quot; button.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Community Plans</h1>
        {community && <p className="text-slate-500">Managing plan for <strong>{community.name}</strong></p>}
      </div>

      {community && community.plan !== "free" && (
        <div className={`mb-8 p-4 rounded-xl border flex items-center justify-between flex-wrap gap-3 ${community.plan_status === "cancelled" ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200"}`}>
          <div className="flex items-center gap-3">
            <CheckCircle2 className={`w-5 h-5 ${community.plan_status === "cancelled" ? "text-amber-600" : "text-emerald-600"}`} />
            <div>
              <p className="font-semibold text-slate-800 text-sm">
                Current plan: <span className="capitalize">{community.plan}</span>
                {community.plan_status === "cancelled" && " (cancels at end of billing period)"}
              </p>
              <p className="text-slate-500 text-xs mt-0.5">
                {community.plan_status === "cancelled"
                  ? "Your community will downgrade to Free at the end of this billing period."
                  : "$19.99 AUD / month"}
              </p>
            </div>
          </div>
          {community.plan_status === "active" && (
            <Button variant="outline" size="sm" className="border-red-200 text-red-600 hover:bg-red-50" onClick={() => setShowCancelConfirm(true)}>
              Cancel Plan
            </Button>
          )}
        </div>
      )}

      {showCancelConfirm && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="font-semibold text-red-800 mb-1">Are you sure you want to cancel?</p>
          <p className="text-red-600 text-sm mb-4">
            Your community will remain on the current plan until the end of this billing period, then automatically downgrade to Free.
            {community?.plan === "private" && " Private communities will be paused (hidden) but not deleted."}
          </p>
          <div className="flex gap-2">
            <Button size="sm" className="bg-red-600 hover:bg-red-700" onClick={handleCancel} disabled={processing}>
              {processing ? "Cancelling..." : "Yes, cancel my plan"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowCancelConfirm(false)}>Keep my plan</Button>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        {PLANS.map((plan) => {
          const isCurrent = community?.plan === plan.id;
          const isActive = community?.plan_status === "active";

          return (
            <Card key={plan.id} className={`border-2 ${plan.color} ${isCurrent && isActive ? "ring-2 ring-blue-400" : ""}`}>
              <CardContent className="pt-6 pb-6">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <h3 className="font-bold text-slate-900 text-lg">{plan.name}</h3>
                  <div className="flex items-center gap-2">
                    {plan.badge && <Badge className="bg-blue-600 text-white text-xs">{plan.badge}</Badge>}
                    {isCurrent && isActive && <Badge className="bg-emerald-100 text-emerald-700 text-xs">Current</Badge>}
                  </div>
                </div>

                <div className="mb-6">
                  {plan.price ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-slate-900">{plan.price}</span>
                      <span className="text-slate-500 text-sm">AUD / month</span>
                    </div>
                  ) : (
                    <span className="text-3xl font-bold text-slate-900">Free</span>
                  )}
                </div>

                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      {feature}
                    </li>
                  ))}
                </ul>

                {plan.id === "free" ? (
                  <Button className="w-full" variant="outline" disabled>
                    {isCurrent ? "Current plan" : "Free forever"}
                  </Button>
                ) : (
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    disabled={processing || (isCurrent && isActive)}
                    onClick={() => handleUpgrade(plan.id)}
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    {isCurrent && isActive ? "Current plan" : `Upgrade to ${plan.name}`}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-center text-xs text-slate-400 mt-6">
        All plans billed in AUD · Cancel anytime · No hidden fees · Powered by Stripe
      </p>
    </div>
  );
}
