import { useState, useRef } from "react";
import { api } from '@/api/client';
import { useMutation } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import MobileSelect from "@/components/ui/MobileSelect";
import { Checkbox } from "@/components/ui/checkbox";
import { Shield } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import PetitionShareModal from "@/components/petitions/PetitionShareModal";
import { userPassesGate } from "@/components/auth/VerificationGate";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { sanitiseText } from "@/lib/sanitise";
import { cleanForDB } from "@/lib/dbHelpers";
import FormErrorHandler from "@/components/ui/FormErrorHandler";

const COUNTRIES = [
  "AU","US","GB","CA","NZ","DE","FR","JP","IN","BR","ZA","SG","NG","KE","MX","IT","ES","NL","SE","NO","DK","FI","PL","CZ","SK","HU","RO","BG","HR","SI","AT","BE","PT","IE","GR","CY","MT","LV","LT","EE","LU","AF","AZ","BD","CN","HK","ID","IL","IQ","IR","IS","JO","KH","KP","KR","KW","LA","LB","LK","MM","MN","MY","NP","OM","PH","PK","PS","QA","SA","TH","TJ","TM","TW","UZ","VN","YE","DZ","AO","CM","CI","DM","DO","EC","EG","ET","GH","GM","GT","GW","HN","HT","JM","LR","LY","MA","ML","MR","MW","MZ","NA","NE","NI","PA","PE","PY","RW","SD","SL","SN","SO","SS","ST","SV","SZ","TG","TN","TZ","UG","UY","VC","VE","XK","ZM","ZW","AR","BO","CL","CO","CR","CU","FK","GF","GP","GY","MQ","PM","PR","SR","TT","UY","VE","AG","AI","AN","AW","BB","BS","BZ","TC","VI","Other"
];

function getBrowserFingerprint() {
  const signals = [
    navigator.userAgent, navigator.language,
    screen.width + "x" + screen.height, screen.colorDepth,
    new Date().getTimezoneOffset(), navigator.hardwareConcurrency || 0, navigator.platform || "",
  ].join("|");
  let hash = 0;
  for (let i = 0; i < signals.length; i++) { hash = ((hash << 5) - hash) + signals.charCodeAt(i); hash |= 0; }
  return Math.abs(hash).toString(36);
}

// Simple math CAPTCHA
function generateCaptcha() {
  const a = Math.floor(Math.random() * 9) + 1;
  const b = Math.floor(Math.random() * 9) + 1;
  return { question: `What is ${a} + ${b}?`, answer: String(a + b) };
}

export default function SignPetitionModal({ petition, user, onClose, onSuccess }) {
  const queryClient = useQueryClient();
  const [showShare, setShowShare] = useState(false);
  const requireFullVerification = !!(petition?.verified_signers_only);
  const pageLoadTime = useRef(Date.now());
  const [captcha] = useState(generateCaptcha);
  const [form, setForm] = useState({
    name: user?.full_name || user?.display_name || "",
    email: user?.email || "",
    country: user?.country_code || "",
    region: user?.region_code || "",
    city: "",
    captchaAnswer: "",
    agreedToTerms: false,
  });
  const fingerprint = getBrowserFingerprint();

  const signMutation = useMutation({
    onMutate: async () => {
      // Optimistically mark as signed so the UI reflects immediately
      await queryClient.cancelQueries({ queryKey: ["mySignature", petition.id] });
      const prevSig = queryClient.getQueryData(["mySignature", petition.id]);
      const prevPetition = queryClient.getQueryData(["petition", petition.id]);
      queryClient.setQueryData(["mySignature", petition.id], { id: "optimistic", petition_id: petition.id, has_withdrawn: false });
      if (prevPetition) {
        queryClient.setQueryData(["petition", petition.id], {
          ...prevPetition,
          signature_count_total: (prevPetition.signature_count_total || 0) + 1,
        });
      }
      return { prevSig, prevPetition };
    },
    onError: (err, _vars, context) => {
      if (context?.prevSig !== undefined) queryClient.setQueryData(["mySignature", petition.id], context.prevSig);
      if (context?.prevPetition) queryClient.setQueryData(["petition", petition.id], context.prevPetition);
      toast.error(err.message || "Failed to sign petition.");
    },
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error("You must be signed in to sign this petition.");
      }

      // CAPTCHA check
      if (form.captchaAnswer.trim() !== captcha.answer) {
        throw new Error("Incorrect CAPTCHA. Please try again.");
      }

      if (!form.agreedToTerms) throw new Error("Please agree to the terms.");

      const signingDuration = Date.now() - pageLoadTime.current;

      // Bot detection — too fast
      if (signingDuration < 3000) {
        throw new Error("Submission too fast. Please take your time to read the petition.");
      }

      // Check for existing signature with same email on this petition
      const existingByEmail = await api.entities.PetitionSignature.filter({
        petition_id: petition.id,
        signer_email: form.email.toLowerCase().trim(),
      });
      if (existingByEmail.some(s => !s.is_invalidated && !s.has_withdrawn)) {
        throw new Error("This email has already been used to sign this petition.");
      }

      // Check device fingerprint duplicates
      const existingByFp = await api.entities.PetitionSignature.filter({
        petition_id: petition.id,
        device_fingerprint: fingerprint,
      });
      const isDuplicateFp = existingByFp.filter(s => !s.is_invalidated && !s.has_withdrawn).length > 0;

      // Rate limit check — get signatures from this fingerprint in last 10 min
      const allByFp = await api.entities.PetitionSignature.filter({ device_fingerprint: fingerprint });
      const now = new Date();
      const last10min = allByFp.filter(s => new Date(s.created_date) > new Date(now - 10 * 60 * 1000)).length;
      const last24h = allByFp.filter(s => new Date(s.created_date) > new Date(now - 24 * 60 * 60 * 1000)).length;

      if (last10min >= 5 || last24h >= 20) {
        throw new Error("Too many signatures from this device. Please wait before signing again.");
      }

      // Trust scoring
      let trustScore = 50;
      let trustLevel = "normal";
      const accountAgeDays = user?.created_date
        ? (Date.now() - new Date(user.created_date).getTime()) / (1000 * 60 * 60 * 24)
        : 0;

      if (user?.is_verified) trustScore += 30;
      if (accountAgeDays > 30) trustScore += 10;
      if (accountAgeDays > 180) trustScore += 10;
      if (isDuplicateFp) trustScore -= 30;
      if (signingDuration < 8000) trustScore -= 20;
      if (!user) trustScore -= 20; // guest

      if (trustScore >= 80) trustLevel = "high";
      else if (trustScore >= 50) trustLevel = "normal";
      else if (trustScore >= 30) trustLevel = "low";
      else trustLevel = "suspicious";

      // Flags
      const isBotSuspect = signingDuration < 8000;
      const isDuplicateSuspect = isDuplicateFp;
      let botFlagReason = isBotSuspect ? `Signed in ${(signingDuration / 1000).toFixed(1)}s` : null;
      let duplicateFlagReason = isDuplicateSuspect ? "Same device fingerprint already signed" : null;

      const sig = await api.entities.PetitionSignature.create(
        cleanForDB({
          petition_id: petition.id,
          user_id: user?.id || undefined,
          signer_name: sanitiseText(form.name.trim(), 200),
          signer_email: form.email.toLowerCase().trim(),
          country_code: form.country,
          region_code: sanitiseText(form.region.trim(), 120) || undefined,
          city: sanitiseText(form.city.trim(), 120) || undefined,
          is_verified_user: user?.is_verified || false,
          is_email_confirmed: true,
          confirmed_at: new Date().toISOString(),
          device_fingerprint: fingerprint,
          trust_level: trustLevel,
          trust_score: Math.max(0, Math.min(100, trustScore)),
          is_duplicate_suspect: isDuplicateSuspect,
          is_bot_suspect: isBotSuspect,
          bot_flag_reason: botFlagReason || undefined,
          duplicate_flag_reason: duplicateFlagReason || undefined,
          is_invalidated: false,
          has_withdrawn: false,
          account_age_days: Math.floor(accountAgeDays),
          signing_duration_ms: signingDuration,
          captcha_passed: true,
        })
      );

      /* Petition counts incremented by DB trigger (petition_signature_count_trigger.sql). */

      return sig;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["petition", petition.id] });
      queryClient.invalidateQueries({ queryKey: ["petitions"] });
      onSuccess?.();
      setShowShare(true);
    },
  });

  if (showShare) {
    const updatedPetition = { ...petition, signature_count_total: (petition.signature_count_total || 0) + 1 };
    return <PetitionShareModal petition={updatedPetition} onClose={() => { setShowShare(false); onClose(); }} />;
  }

  // Gate check before showing modal
  if (!userPassesGate(user, requireFullVerification)) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" />
              Verification Required
            </DialogTitle>
          </DialogHeader>
          {requireFullVerification ? (
            <div className="text-center py-4 space-y-3">
              <p className="text-slate-700 text-sm">
                This petition requires full <strong>Stripe Identity verification</strong> ($12.99 AUD) to sign.
              </p>
              <a
                href={createPageUrl("GetVerified")}
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2 rounded-lg text-sm"
              >
                Verify Identity — $12.99 AUD
              </a>
            </div>
          ) : (
            <div className="text-center py-4 space-y-3">
              <p className="text-slate-700 text-sm">
                You need to verify your <strong>email or phone number</strong> before signing. It's free.
              </p>
              <a
                href={createPageUrl("SecuritySettings")}
                className="inline-block bg-amber-500 hover:bg-amber-600 text-white font-semibold px-5 py-2 rounded-lg text-sm"
              >
                Verify Email — It's Free
              </a>
            </div>
          )}
          <button onClick={onClose} className="text-xs text-slate-400 hover:text-slate-600 mt-2 text-center w-full">Cancel</button>
        </DialogContent>
      </Dialog>
    );
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Please enter your name."); return; }
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) { toast.error("Please enter a valid email."); return; }
    if (!form.country) { toast.error("Please select your country."); return; }
    signMutation.mutate();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            Sign This Petition
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-slate-600 -mt-2 mb-1 line-clamp-2 italic">"{petition.title}"</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="sig-name">Full Name *</Label>
            <Input id="sig-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Your full name" />
          </div>

          <div className="space-y-1">
            <Label htmlFor="sig-email">Email Address *</Label>
            <Input id="sig-email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="your@email.com" />
            <p className="text-xs text-slate-500">Used to prevent duplicate signatures.</p>
          </div>

          <div className="space-y-1">
            <Label>Country *</Label>
            <MobileSelect
              value={form.country}
              onValueChange={v => setForm(f => ({ ...f, country: v }))}
              options={COUNTRIES.map(c => ({ value: c, label: c }))}
              placeholder="Select country"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="sig-region" className="text-xs">State / Region <span className="text-slate-400">(optional)</span></Label>
              <Input id="sig-region" value={form.region} onChange={e => setForm(f => ({ ...f, region: e.target.value }))} placeholder="e.g. Queensland" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sig-city" className="text-xs">City <span className="text-slate-400">(optional)</span></Label>
              <Input id="sig-city" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="e.g. Brisbane" />
            </div>
          </div>

          <div className="space-y-1 bg-slate-50 rounded-lg p-3 border border-slate-200">
            <Label htmlFor="captcha" className="text-sm font-semibold">{captcha.question} *</Label>
            <Input
              id="captcha"
              value={form.captchaAnswer}
              onChange={e => setForm(f => ({ ...f, captchaAnswer: e.target.value }))}
              placeholder="Enter answer"
              className="w-32"
            />
          </div>

          <div className="flex items-start gap-2">
            <Checkbox
              id="terms"
              checked={form.agreedToTerms}
              onCheckedChange={v => setForm(f => ({ ...f, agreedToTerms: v }))}
            />
            <label htmlFor="terms" className="text-xs text-slate-600 cursor-pointer leading-relaxed">
              I confirm this is my genuine signature and that I support this petition.
            </label>
          </div>

                   <FormErrorHandler error={signMutation.isError ? signMutation.error : null} />

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={signMutation.isPending} className="flex-1 bg-blue-600 hover:bg-blue-700">
              {signMutation.isPending ? "Signing..." : "Sign Petition"}
            </Button>
          </div>
        </form>

        <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700 flex items-start gap-2">
          <Shield className="w-4 h-4 mt-0.5 shrink-0" />
          <span>Your signature is recorded immediately and kept private. It will only be used to demonstrate public support for this cause.</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}