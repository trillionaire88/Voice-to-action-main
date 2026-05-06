import { useState } from "react";
import { api } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Save, CreditCard, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useReAuth } from "@/components/ReAuthModal";

export default function BankDetailsConfig() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    account_name: "",
    bsb: "",
    account_number: "",
    payment_reference_instructions: ""
  });
  const [existingId, setExistingId] = useState(null);
  const { requireReAuth } = useReAuth();

  useQuery({
    queryKey: ["adminBankConfig"],
    queryFn: async () => {
      const configs = await api.entities.PlatformConfig.filter({ key: "owner_bank_details" });
      if (configs.length > 0) {
        try {
          const parsed = JSON.parse(configs[0].value);
          setForm(parsed);
          setExistingId(configs[0].id);
          return configs[0];
        } catch {}
      }
      return null;
    }
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const value = JSON.stringify(form);
      if (existingId) {
        await api.entities.PlatformConfig.update(existingId, { value });
      } else {
        const created = await api.entities.PlatformConfig.create({
          key: "owner_bank_details",
          value,
          category: "business",
          description: "Owner bank details for direct transfers and payments",
          is_public: false
        });
        setExistingId(created.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["adminBankConfig"]);
      queryClient.invalidateQueries(["bankDetails"]);
      toast.success("Bank details saved successfully!");
    },
    onError: () => toast.error("Failed to save bank details")
  });

  const update = (field, value) => setForm(p => ({ ...p, [field]: value }));

  return (
    <div className="space-y-6">
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-600" />
            Owner Bank Details Configuration
          </CardTitle>
          <p className="text-sm text-slate-600 mt-1">
            These details appear on the Support Owner (Gift) page and verification/withdrawal payment screens.
            Only you can see and edit this. Keep it secure.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Account Name *</Label>
              <Input
                value={form.account_name}
                onChange={e => update("account_name", e.target.value)}
                placeholder="e.g. Jeremy Kyle Whisson"
              />
            </div>
            <div className="space-y-2">
              <Label>BSB *</Label>
              <Input
                value={form.bsb}
                onChange={e => update("bsb", e.target.value)}
                placeholder="e.g. 123-456"
              />
            </div>
            <div className="space-y-2">
              <Label>Account Number *</Label>
              <Input
                value={form.account_number}
                onChange={e => update("account_number", e.target.value)}
                placeholder="e.g. 12345678"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Payment Reference Instructions</Label>
            <Textarea
              value={form.payment_reference_instructions}
              onChange={e => update("payment_reference_instructions", e.target.value)}
              placeholder="e.g. Use your name and email as reference. For verification: VERIFY-[your-email]"
              rows={3}
            />
            <p className="text-xs text-slate-500">This helps you identify who made each payment.</p>
          </div>

          <Alert className="border-amber-200 bg-amber-50">
            <AlertDescription className="text-amber-900 text-sm">
              <strong>Security Notice:</strong> These details are only shown to users who explicitly navigate
              to the gift/payment pages. They are never publicly listed.
            </AlertDescription>
          </Alert>

          <Button
            onClick={() => requireReAuth(() => saveMutation.mutate())}
            disabled={saveMutation.isPending || !form.account_name || !form.account_number}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {saveMutation.isPending ? (
              "Saving..."
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Bank Details
              </>
            )}
          </Button>

          {existingId && (
            <div className="flex items-center gap-2 text-emerald-700 text-sm">
              <CheckCircle2 className="w-4 h-4" />
              Bank details are configured and active
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}