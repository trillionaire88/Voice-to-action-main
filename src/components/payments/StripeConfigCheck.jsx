import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function StripeConfigCheck() {
  const { data, isLoading } = useQuery({
    queryKey: ["stripe-config-check"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;
      const { data, error } = await supabase.functions.invoke("stripe-config-check", { body: {} });
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return null;
  if (!data) return null;

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle className="text-base">Stripe Environment Check</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between"><span>Secret key configured</span><Badge variant={data.has_secret_key ? "default" : "destructive"}>{data.has_secret_key ? "Yes" : "No"}</Badge></div>
        <div className="flex justify-between"><span>Webhook secret configured</span><Badge variant={data.has_webhook_secret ? "default" : "destructive"}>{data.has_webhook_secret ? "Yes" : "No"}</Badge></div>
        <div className="flex justify-between"><span>Mode</span><Badge variant={data.is_live_mode ? "default" : "secondary"}>{data.is_live_mode ? "LIVE" : "TEST"}</Badge></div>
        {!data.is_live_mode && (
          <div className="text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">
            ⚠️ Stripe is in TEST MODE — no real payments will be processed
          </div>
        )}
      </CardContent>
    </Card>
  );
}
