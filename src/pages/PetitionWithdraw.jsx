import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { createPageUrl } from "@/utils";
import { sendPetitionWithdrawalEmail, hasAlreadyPaidWithdrawal } from "@/api/paymentsApi";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft, FileText, Download, CreditCard, AlertTriangle,
  CheckCircle2, Copy, FileDown, Table,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { initiateStripeCheckout } from "@/lib/stripeCheckout";
import { appHostname, appUrl, getAppOrigin, SUPPORT_EMAIL } from "@/constants/siteUrl";

function buildCSV(petition, petitionId) {
  const esc = (val) => `"${String(val || "").replace(/"/g, '""')}"`;
  const lines = [
    `Platform,Voice to Action`,
    `Legal Entity,Every Voice Proprietary Limited`,
    `Document Type,Official Petition Summary Export`,
    `Website,${getAppOrigin()}`,
    `Export Date,${esc(format(new Date(), "PPP p"))}`,
    ``,
    `PETITION DETAILS`,
    `Title,${esc(petition.title)}`,
    `Short Summary,${esc(petition.short_summary)}`,
    `Full Description,${esc(petition.full_description)}`,
    `Creator,${esc(petition.creator_name || "")}`,
    `Created Date,${esc(petition.created_date ? format(new Date(petition.created_date), "PPP") : "")}`,
    `Category,${esc((petition.category || "").replace(/_/g, " "))}`,
    `Target Name,${esc(petition.target_name || "")}`,
    `Target Type,${esc((petition.target_type || "").replace(/_/g, " "))}`,
    `Country,${esc(petition.country_code || "")}`,
    `Status,${esc(petition.status || "")}`,
    ``,
    `SIGNATURE DATA`,
    `Total Signatures,${petition.signature_count_total || 0}`,
    `Verified Signatures,${petition.signature_count_verified || 0}`,
    `Unverified Signatures,${(petition.signature_count_total || 0) - (petition.signature_count_verified || 0)}`,
    `Signature Goal,${petition.signature_goal || 0}`,
    `Goal Progress,${petition.signature_goal > 0 ? Math.round(((petition.signature_count_total || 0) / petition.signature_goal) * 100) + "%" : "No goal set"}`,
    ``,
    `LEGAL DISCLAIMER`,
    `This document is an official summary export from Voice to Action.`,
    `Personal signer data (names emails addresses) is not included in this export for privacy reasons.`,
    `This summary is provided for the petition creator and authorised parties only.`,
    `Voice to Action is a product of Every Voice Proprietary Limited registered in Australia.`,
    `For verification contact ${SUPPORT_EMAIL}`,
    ``,
    `Petition URL,${appUrl(`/PetitionDetail?id=${petitionId}`)}`,
  ];
  return lines.join("\n");
}

function buildPrintablePDF(petition, petitionId) {
  const fmt = (val) => val || "—";
  const progress = petition.signature_goal > 0
    ? Math.round(((petition.signature_count_total || 0) / petition.signature_goal) * 100)
    : null;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>Petition Summary — ${petition.title}</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #1e293b; }
  .header { border-bottom: 3px solid #1d4ed8; padding-bottom: 16px; margin-bottom: 24px; }
  .logo { font-size: 22px; font-weight: 900; color: #1d4ed8; }
  .legal { font-size: 11px; color: #64748b; margin-top: 4px; }
  h1 { font-size: 20px; margin: 0 0 8px; color: #0f172a; }
  .meta { font-size: 13px; color: #475569; margin-bottom: 20px; }
  .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 24px 0; }
  .stat { background: #f1f5f9; border-radius: 8px; padding: 16px; text-align: center; }
  .stat-num { font-size: 28px; font-weight: 900; color: #1d4ed8; }
  .stat-num.verified { color: #059669; }
  .stat-label { font-size: 12px; color: #64748b; margin-top: 4px; }
  .section { margin: 20px 0; }
  .section h2 { font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
  .row { display: flex; gap: 8px; padding: 6px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
  .row-label { font-weight: 600; min-width: 160px; color: #475569; }
  .progress-bar { background: #e2e8f0; border-radius: 4px; height: 8px; margin-top: 8px; }
  .progress-fill { background: #1d4ed8; border-radius: 4px; height: 8px; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; }
  .badge { display: inline-block; background: #dbeafe; color: #1d4ed8; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }
  @media print { body { margin: 20px; } }
</style>
</head>
<body>
<div class="header">
  <div class="logo">Voice to Action</div>
  <div class="legal">A product of Every Voice Proprietary Limited · Registered in Australia · ${appHostname()}</div>
  <div class="legal" style="margin-top:4px">OFFICIAL PETITION SUMMARY · Generated: ${format(new Date(), "PPP p")}</div>
</div>
<h1>${fmt(petition.title)}</h1>
<div class="meta">
  <span class="badge">${fmt((petition.category || "").replace(/_/g, " "))}</span>
  &nbsp;·&nbsp; ${fmt(petition.country_code)} &nbsp;·&nbsp; Status: <strong>${fmt(petition.status)}</strong>
</div>
<div class="stats">
  <div class="stat"><div class="stat-num">${(petition.signature_count_total || 0).toLocaleString()}</div><div class="stat-label">Total Signatures</div></div>
  <div class="stat"><div class="stat-num verified">${(petition.signature_count_verified || 0).toLocaleString()}</div><div class="stat-label">Verified Signatures</div></div>
  <div class="stat"><div class="stat-num">${fmt(petition.signature_goal?.toLocaleString())}</div><div class="stat-label">Signature Goal</div></div>
</div>
${progress !== null ? `<div style="margin:0 0 20px"><div style="font-size:13px;color:#475569;margin-bottom:6px">Goal Progress: <strong>${progress}%</strong></div><div class="progress-bar"><div class="progress-fill" style="width:${Math.min(progress,100)}%"></div></div></div>` : ""}
<div class="section">
  <h2>Petition Details</h2>
  <div class="row"><span class="row-label">Short Summary</span><span>${fmt(petition.short_summary)}</span></div>
  <div class="row"><span class="row-label">Target</span><span>${fmt(petition.target_name)} (${fmt((petition.target_type||"").replace(/_/g," "))})</span></div>
  <div class="row"><span class="row-label">Creator</span><span>${fmt(petition.creator_name)}</span></div>
  <div class="row"><span class="row-label">Created Date</span><span>${petition.created_date ? format(new Date(petition.created_date),"PPP") : "—"}</span></div>
  <div class="row"><span class="row-label">Petition URL</span><span style="word-break:break-all;font-size:11px">${appUrl(`/PetitionDetail?id=${petitionId}`)}</span></div>
</div>
${petition.full_description ? `<div class="section"><h2>Full Description</h2><p style="font-size:13px;line-height:1.6;color:#374151">${petition.full_description}</p></div>` : ""}
${petition.requested_action ? `<div class="section"><h2>Requested Action</h2><p style="font-size:13px;line-height:1.6;color:#374151">${petition.requested_action}</p></div>` : ""}
<div class="footer">
  <p><strong>Privacy Notice:</strong> Personal signer data (names, emails, addresses) is not included in this export in accordance with the Australian Privacy Act 1988 and applicable privacy law.</p>
  <p>This document is an official export from Voice to Action. For verification contact ${SUPPORT_EMAIL}</p>
  <p>© ${new Date().getFullYear()} Every Voice Proprietary Limited. All rights reserved. Voice to Action™ is a trademark of Every Voice Proprietary Limited.</p>
</div>
</body>
</html>`;
}

export default function PetitionWithdraw() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const petitionId = searchParams.get("id");

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alreadyPaid, setAlreadyPaid] = useState(false);
  const [step, setStep] = useState("preview");
  const [downloading, setDownloading] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: authUser } }) => {
      if (!authUser) {
        navigate(createPageUrl("Petitions"));
        return;
      }
      setUser(authUser);
    });
    setTimeout(() => setLoading(false), 800);
  }, [navigate]);

  const { data: profile } = useQuery({
    queryKey: ["petition-withdraw-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: petition, isLoading: petitionLoading } = useQuery({
    queryKey: ["petition", petitionId],
    queryFn: async () => {
      const { data } = await supabase.from("petitions").select("*").eq("id", petitionId).maybeSingle();
      const loadedPetition = data || null;

      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (authUser && petitionId) {
        const paid = await hasAlreadyPaidWithdrawal(petitionId);
        setAlreadyPaid(paid);
      }

      return loadedPetition;
    },
    enabled: !!petitionId,
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paid = params.get("paid");
    const sessionId = params.get("session_id");

    if (paid === "1" && petition) {
      window.history.replaceState({}, "", `${window.location.pathname}?id=${petitionId}`);
      setAlreadyPaid(true);
      sendPetitionWithdrawalEmail(petitionId, sessionId || undefined)
        .then(() => {
          toast.success("Payment confirmed! Your withdrawal report has been sent to your email.");
          setStep("download");
        })
        .catch((err) => {
          toast.error(`Payment received but email failed: ${err.message}`);
          setStep("preview");
        });
    }
  }, [petition, petitionId]);

  const downloadCSV = () => {
    if (!petition) return;
    const csv = buildCSV(petition, petitionId);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `voice_to_action_petition_${petitionId}_summary.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("CSV downloaded!");
  };

  const downloadPDF = () => {
    if (!petition) return;
    setDownloading(true);
    try {
      const html = buildPrintablePDF(petition, petitionId);
      const blob = new Blob([html], { type: "text/html;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const printWindow = window.open(url, "_blank");
      if (printWindow) {
        printWindow.onload = () => {
          setTimeout(() => { printWindow.print(); URL.revokeObjectURL(url); }, 500);
        };
        toast.success("PDF report opened — use Print → Save as PDF to save.");
      } else {
        const a = document.createElement("a");
        a.href = url;
        a.download = `voice_to_action_petition_${petitionId}_report.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.success("Report downloaded as HTML — open in browser to print as PDF.");
      }
    } catch (err) {
      toast.error("Failed to generate PDF. Try the CSV download instead.");
    } finally {
      setDownloading(false);
    }
  };

  const handlePayAndWithdraw = async () => {
    if (alreadyPaid) {
      try {
        await sendPetitionWithdrawalEmail(petitionId);
        toast.success("Withdrawal report sent to your email!");
        setStep("download");
      } catch (err) {
        toast.error(err.message || "Failed to send email");
      }
      return;
    }

    try {
      setCheckingOut(true);
      await initiateStripeCheckout({
        payment_type: "petition_withdrawal",
        success_url: `${window.location.origin}/PetitionWithdraw?paid=1&id=${petitionId}`,
        cancel_url: `${window.location.origin}/PetitionWithdraw?id=${petitionId}&payment_cancelled=1`,
        metadata: { user_id: user?.id || "", petition_id: petitionId || "" },
      });
    } catch (err) {
      toast.error(err.message || "Failed to start checkout");
    } finally {
      setCheckingOut(false);
    }
  };

  if (loading || petitionLoading) return (
    <div className="max-w-2xl mx-auto px-4 py-12 space-y-4">
      <Skeleton className="h-8 w-48" /><Skeleton className="h-48 w-full" />
    </div>
  );

  if (!petition) return (
    <div className="max-w-2xl mx-auto px-4 py-12 text-center">
      <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
      <h2 className="text-xl font-bold text-slate-900 mb-2">Petition not found</h2>
      <Button onClick={() => navigate(createPageUrl("Petitions"))}>Back to Petitions</Button>
    </div>
  );

  const isCreator = user?.id === petition.creator_user_id || profile?.role === "owner_admin";
  const isPublicAllowed = petition.allow_public_withdrawal === true;

  if (!isCreator && !isPublicAllowed) return (
    <div className="max-w-2xl mx-auto px-4 py-12 text-center">
      <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
      <h2 className="text-xl font-bold text-slate-900 mb-2">Not Available</h2>
      <p className="text-slate-600 mt-2">Only the petition creator can export this petition's data.</p>
      <Button className="mt-4" onClick={() => navigate(-1)}>Go Back</Button>
    </div>
  );

  if (step === "download") return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-10 h-10 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Download Unlocked</h1>
        <p className="text-slate-600 text-sm">Your downloads are ready. Both files are generated instantly in your browser — no email needed.</p>
      </div>

      <Card className="border-slate-200 mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-slate-800 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" /> {petition.title}
          </CardTitle>
          <CardDescription className="text-xs">{petition.short_summary}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-3 text-center">
          <div><p className="text-2xl font-bold text-slate-900">{(petition.signature_count_total || 0).toLocaleString()}</p><p className="text-xs text-slate-500">Total</p></div>
          <div><p className="text-2xl font-bold text-emerald-600">{(petition.signature_count_verified || 0).toLocaleString()}</p><p className="text-xs text-slate-500">Verified</p></div>
          <div><p className="text-2xl font-bold text-blue-600">{petition.signature_goal?.toLocaleString() || "—"}</p><p className="text-xs text-slate-500">Goal</p></div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <Card className="border-blue-200 bg-blue-50 hover:shadow-md transition-shadow cursor-pointer" onClick={downloadPDF}>
          <CardContent className="pt-5 pb-5 text-center">
            <FileDown className="w-10 h-10 text-blue-600 mx-auto mb-3" />
            <h3 className="font-bold text-slate-900 mb-1">PDF Report</h3>
            <p className="text-xs text-slate-600 mb-3">Full formatted report with petition details, signature stats, and legal footer.</p>
            <Button className="w-full bg-blue-600 hover:bg-blue-700" disabled={downloading}>
              <Download className="w-4 h-4 mr-2" />{downloading ? "Generating…" : "Download PDF"}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50 hover:shadow-md transition-shadow cursor-pointer" onClick={downloadCSV}>
          <CardContent className="pt-5 pb-5 text-center">
            <Table className="w-10 h-10 text-emerald-600 mx-auto mb-3" />
            <h3 className="font-bold text-slate-900 mb-1">CSV Summary</h3>
            <p className="text-xs text-slate-600 mb-3">Spreadsheet-ready data export. Open in Excel, Google Sheets, or Numbers.</p>
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
              <Download className="w-4 h-4 mr-2" />Download CSV
            </Button>
          </CardContent>
        </Card>
      </div>

      <Alert className="border-blue-200 bg-blue-50 mb-4">
        <CheckCircle2 className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800 text-sm">
          <strong>Downloads are instant — no email required.</strong> Your petition stays active. Your $1.99 payment unlocks unlimited future downloads.
        </AlertDescription>
      </Alert>

      <div className="flex gap-3 justify-center">
        <Button variant="outline" onClick={() => navigate(`/PetitionDetail?id=${petitionId}`)}>View Petition</Button>
        <Button variant="ghost" className="text-xs text-slate-500" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/PetitionDetail?id=${petitionId}`); toast.success("Link copied!"); }}>
          <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy Petition Link
        </Button>
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-24">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back
      </Button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Export Petition Data</h1>
        <p className="text-slate-500 text-sm">Download your petition as a PDF report and CSV file — instantly in your browser, no email needed.</p>
      </div>

      {!isCreator && isPublicAllowed && (
        <Alert className="border-amber-200 bg-amber-50 mb-4">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 text-sm">The petition creator has enabled public data export. Pay $1.99 to download.</AlertDescription>
        </Alert>
      )}

      <Card className="border-slate-200 mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><FileText className="w-4 h-4 text-blue-600" /> {petition.title}</CardTitle>
          <CardDescription>{petition.short_summary}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4 text-center">
          <div><p className="text-2xl font-bold text-slate-900">{(petition.signature_count_total || 0).toLocaleString()}</p><p className="text-xs text-slate-500 mt-0.5">Total</p></div>
          <div><p className="text-2xl font-bold text-emerald-600">{(petition.signature_count_verified || 0).toLocaleString()}</p><p className="text-xs text-slate-500 mt-0.5">Verified</p></div>
          <div><Badge className={petition.status === "active" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-slate-100 text-slate-600"}>{petition.status}</Badge></div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 mb-6">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-bold text-slate-700">What you receive instantly</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {[
            { icon: FileDown, color: "text-blue-500", text: "PDF Report — professionally formatted with all petition details, signature stats, legal header/footer" },
            { icon: Table, color: "text-emerald-500", text: "CSV Export — spreadsheet-ready data for Excel, Google Sheets, or any analysis tool" },
            { icon: Download, color: "text-purple-500", text: "Instant browser download — no email, no waiting, no third-party service" },
            { icon: CheckCircle2, color: "text-slate-500", text: "Privacy compliant — personal signer data is never included per Australian Privacy Act" },
          ].map(({ icon: Icon, color, text }) => (
            <div key={text} className="flex items-start gap-2 text-sm text-slate-700">
              <Icon className={`w-4 h-4 ${color} flex-shrink-0 mt-0.5`} /><span>{text}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Alert className="border-emerald-200 bg-emerald-50 mb-6">
        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        <AlertDescription className="text-emerald-800 text-sm"><strong>Your petition stays live.</strong> Exporting data does not affect your petition — it continues collecting signatures.</AlertDescription>
      </Alert>

      {alreadyPaid ? (
        <div className="bg-emerald-600 rounded-2xl p-5 text-white mb-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6" />
            <div>
              <p className="font-bold text-lg">Already Unlocked</p>
              <p className="text-emerald-100 text-sm">You've paid for this petition's export. All future downloads are free.</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-5 text-white mb-2">
          <div className="flex items-center gap-3">
            <CreditCard className="w-6 h-6" />
            <div>
              <p className="font-bold text-xl">$1.99 AUD</p>
              <p className="text-blue-100 text-sm">{isCreator ? "One-time fee — unlocks unlimited future downloads for this petition" : "One-time fee for this petition export"}</p>
            </div>
          </div>
        </div>
      )}

      {!alreadyPaid && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4 text-center">
          ⚠️ All payments are final and non-refundable unless the service is not delivered.
        </p>
      )}

      <Button
        onClick={handlePayAndWithdraw}
        disabled={checkingOut}
        className={`w-full h-12 text-base font-semibold ${alreadyPaid ? "bg-emerald-600 hover:bg-emerald-700" : "bg-blue-600 hover:bg-blue-700"}`}
      >
        {alreadyPaid
          ? <><Download className="w-5 h-5 mr-2" />Access My Downloads</>
          : <><CreditCard className="w-5 h-5 mr-2" />{checkingOut ? "Redirecting to Stripe..." : "Pay $1.99 & Download Now"}</>
        }
      </Button>
      <p className="text-center text-xs text-slate-400 mt-2">
        {alreadyPaid ? "PDF + CSV downloaded instantly in your browser." : "Secured by Stripe. Downloads are instant after payment."}
      </p>
    </div>
  );
}