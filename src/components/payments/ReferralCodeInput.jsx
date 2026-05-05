import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tag, CheckCircle2, X } from "lucide-react";
import { toast } from "sonner";

export default function ReferralCodeInput({ onCodeApplied, onCodeRemoved, basePrice, autoApplyCode }) {
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState(null);
  const [checking, setChecking] = useState(false);
  const [discount, setDiscount] = useState(0);
  const autoTried = useRef(false);

  useEffect(() => {
    if (!autoApplyCode?.trim() || autoTried.current || applied) return;
    autoTried.current = true;
    let cancelled = false;
    (async () => {
      setChecking(true);
      try {
        const { data: codes, error } = await supabase
          .from("referral_codes")
          .select("*")
          .eq("code", autoApplyCode.trim().toUpperCase())
          .eq("active", true)
          .limit(1);
        if (cancelled || error) return;
        if (!codes?.length) return;
        const record = codes[0];
        const safeDiscount = 5;
        const discountAmount = basePrice ? Math.round(basePrice * (safeDiscount / 100)) : 0;
        setApplied(record);
        setDiscount(discountAmount);
        onCodeApplied?.(record.code, safeDiscount, discountAmount);
        toast.success(`${safeDiscount}% discount applied from your saved code!`);
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => { cancelled = true; };
  }, [autoApplyCode, applied, basePrice, onCodeApplied]);

  const handleApply = async () => {
    if (!code.trim()) return;
    setChecking(true);
    try {
      const { data: codes, error } = await supabase
        .from("referral_codes")
        .select("*")
        .eq("code", code.trim().toUpperCase())
        .eq("active", true)
        .limit(1);

      if (error) throw error;

      if (!codes || codes.length === 0) {
        toast.error("Invalid or inactive referral code");
        return;
      }

      const record = codes[0];
      const safeDiscount = 5; // enforce 5% always
      const discountAmount = basePrice ? Math.round(basePrice * (safeDiscount / 100)) : 0;
      setApplied(record);
      setDiscount(discountAmount);
      onCodeApplied && onCodeApplied(record.code, safeDiscount, discountAmount);
      toast.success(`${safeDiscount}% discount applied!`);
    } catch {
      toast.error("Failed to verify code");
    } finally {
      setChecking(false);
    }
  };

  const handleRemove = () => {
    setApplied(null);
    setCode("");
    setDiscount(0);
    onCodeRemoved && onCodeRemoved();
  };

  if (applied) {
    const finalPrice = basePrice ? basePrice - discount : 0;
    return (
      <div className="space-y-2 p-3 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
          <span className="text-sm font-medium text-green-800 flex-1">
            Code <strong>{applied.code}</strong> — 5% off applied
          </span>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-green-700 hover:text-red-600" onClick={handleRemove}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
        {basePrice && (
          <div className="text-xs text-green-700 space-y-0.5 ml-5">
            <div className="flex justify-between">
              <span>Original:</span>
              <span className="font-mono">${(basePrice / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-green-600">
              <span>Discount (5%):</span>
              <span className="font-mono">-${(discount / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-semibold border-t border-green-200 pt-0.5">
              <span>Final:</span>
              <span className="font-mono">${(finalPrice / 100).toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
        <Tag className="w-3.5 h-3.5" /> Referral Code (optional)
      </label>
      <div className="flex gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="e.g. VTA-XXXXXXXX"
          className="font-mono bg-white text-slate-900 border-slate-300 placeholder:text-slate-400"
          maxLength={20}
        />
        <Button
          type="button"
          variant="outline"
          onClick={handleApply}
          disabled={checking || !code.trim()}
          className="shrink-0"
        >
          {checking ? "Checking..." : "Apply"}
        </Button>
      </div>
      <p className="text-xs text-slate-400">Enter a creator referral code for 5% off.</p>
    </div>
  );
}
