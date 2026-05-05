import React, { useState, useEffect } from "react";
import AdminGuard from "@/components/auth/AdminGuard";

// Inline selector to pick a petition and view its integrity panel
function PetitionIntegritySelector({ adminUser, allPetitions }) {
  const [selected, setSelected] = useState(null);
  if (selected) {
    return (
      <div>
        <button onClick={() => setSelected(null)} className="text-sm text-blue-600 hover:underline mb-4 flex items-center gap-1">
          ← Back to petition list
        </button>
        <SignatureIntegrityPanel petition={selected} adminUser={adminUser} />
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {allPetitions.length === 0 && <p className="text-slate-500 text-sm">No petitions found.</p>}
      {allPetitions.map(p => (
        <div key={p.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:border-blue-300 hover:bg-blue-50/20 cursor-pointer transition-colors"
          onClick={() => setSelected(p)}>
          <div>
            <p className="font-medium text-slate-900 line-clamp-1">{p.title}</p>
            <p className="text-xs text-slate-500">{p.status} · {p.signature_count_total || 0} signatures · {p.country_code}</p>
          </div>
          <span className="text-xs text-blue-600 font-medium">View Integrity →</span>
        </div>
      ))}
    </div>
  );
}
import { api } from '@/api/client';
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Settings, Users, BarChart3, Globe2, TrendingUp, Flag, CheckCircle2,
  AlertTriangle, Shield, CreditCard, FileText, Heart, Package, Lock,
  Bell, Activity, ClipboardList, Scale, Send, Building2, Flame, Star, Gift,
  ShieldAlert,
} from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import BankDetailsConfig from "@/components/admin/BankDetailsConfig";
import VerificationQueue from "@/components/admin/VerificationQueue";
import WithdrawalQueue from "@/components/admin/WithdrawalQueue";
import ModerationPanel from "@/components/admin/ModerationPanel";
import TakedownPanel from "@/components/admin/TakedownPanel";
import BrigadePanel from "@/components/admin/BrigadePanel";
import SignatureIntegrityPanel from "@/components/petitions/SignatureIntegrityPanel";
import PetitionDeliveryPanel from "@/components/admin/PetitionDeliveryPanel";
import ReputationAdminPanel from "@/components/admin/ReputationAdminPanel";
import PublicVotingAdminPanel from "@/components/admin/PublicVotingAdminPanel";
import ScorecardAdminPanel from "@/components/admin/ScorecardAdminPanel";
import ApiDashboard from "@/components/admin/ApiDashboard";
import AdaptiveEnginePanel from "@/components/admin/AdaptiveEnginePanel";
import FederationPanel from "@/components/admin/FederationPanel";
import LedgerPanel from "@/components/admin/LedgerPanel";
import InfrastructurePanel from "@/components/admin/InfrastructurePanel";
import { Link } from "react-router-dom";

const NAV_TABS = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "moderation", label: "Moderation", icon: Flag },
  { id: "brigade", label: "Brigade Review", icon: AlertTriangle },
  { id: "takedown", label: "Legal Complaints", icon: Scale },
  { id: "verification", label: "Verification Queue", icon: Shield },
  { id: "withdrawals", label: "Withdrawals", icon: Package },
  { id: "charities", label: "Charity Review", icon: Heart },
  { id: "petition_integrity", label: "Petition Integrity", icon: Shield },
  { id: "deliveries", label: "Petition Deliveries", icon: Send },
  { id: "media", label: "Media Amplification", icon: TrendingUp },
  { id: "voting", label: "Public Voting", icon: BarChart3 },
  { id: "scorecards", label: "Scorecards", icon: Star },
  { id: "reputation", label: "Reputation", icon: Shield },
  { id: "bank", label: "Bank Details", icon: CreditCard },
  { id: "api", label: "Platform API", icon: Globe2 },
  { id: "adaptive", label: "Adaptive Engine", icon: Activity },
  { id: "infrastructure", label: "Infrastructure", icon: BarChart3 },
  { id: "federation", label: "Federation", icon: Globe2 },
  { id: "ledger", label: "Verification Ledger", icon: Shield },
  { id: "creator_codes", label: "Creator Codes", icon: Gift },
  { id: "referral_transactions", label: "Referral Payouts", icon: CreditCard },
];

export default function MasterAdmin() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [panicLoading, setPanicLoading] = useState(false);
  const [panicReason, setPanicReason] = useState("");

  useEffect(() => { loadUser(); }, []);

  const OWNER_EMAIL = "voicetoaction@outlook.com";
  const PANIC_OWNER_EMAIL = import.meta.env.VITE_OWNER_PANIC_EMAIL || "jeremywhisson@gmail.com";
  const canUsePanic = user?.email === PANIC_OWNER_EMAIL;

  const activatePanic = async () => {
    if (!window.confirm("ACTIVATE PANIC MODE? This will lock the entire platform to read-only. Are you certain?")) return;
    setPanicLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not signed in");
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/panic-mode`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action: "activate", reason: panicReason }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (data.success) toast.error("PANIC MODE ACTIVATED — platform is locked");
      else toast.error(data.error || "Failed");
    } catch (e) {
      toast.error(e.message || "Failed");
    } finally {
      setPanicLoading(false);
    }
  };

  const deactivatePanic = async () => {
    setPanicLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not signed in");
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/panic-mode`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action: "deactivate" }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (data.success) toast.success("Panic mode deactivated");
      else toast.error(data.error || "Failed");
    } catch (e) {
      toast.error(e.message || "Failed");
    } finally {
      setPanicLoading(false);
    }
  };

  const loadUser = async () => {
    try {
      const u = await api.auth.me();
      const isOwner = u.role === "owner_admin" || (u.role === "admin" && u.email === OWNER_EMAIL);
      if (!isOwner) { navigate(createPageUrl("Home")); return; }
      setUser(u);
    } catch { navigate(createPageUrl("Home")); }
    finally { setLoading(false); }
  };

  const { data: allUsers = [] } = useQuery({ queryKey: ["allUsers"], queryFn: () => api.entities.User.list(), enabled: !!user });
  const { data: allPolls = [] } = useQuery({ queryKey: ["allPolls"], queryFn: () => api.entities.Poll.list(), enabled: !!user });
  const { data: allVotes = [] } = useQuery({ queryKey: ["allVotes"], queryFn: () => api.entities.Vote.list(), enabled: !!user });
  const { data: allReports = [] } = useQuery({ queryKey: ["allReports"], queryFn: () => api.entities.Report.list(), enabled: !!user });
  const { data: allPetitions = [] } = useQuery({ queryKey: ["allPetitions"], queryFn: () => api.entities.Petition.list(), enabled: !!user });
  const { data: verificationRequests = [] } = useQuery({ queryKey: ["verificationRequests"], queryFn: () => api.entities.VerificationRequest.list(), enabled: !!user });
  const { data: charitySubmissions = [] } = useQuery({ queryKey: ["charitySubmissions"], queryFn: () => api.entities.CharitySubmission.list(), enabled: !!user });
  const { data: withdrawals = [] } = useQuery({ queryKey: ["petitionWithdrawals"], queryFn: () => api.entities.PetitionWithdrawal.list(), enabled: !!user });
  const { data: donations = [] } = useQuery({ queryKey: ["platformDonations"], queryFn: () => api.entities.PlatformDonation.list(), enabled: !!user });

  if (loading) return (
    <AdminGuard ownerOnly>
      <div className="max-w-7xl mx-auto px-4 py-12">
        <Skeleton className="h-32 w-full mb-6" />
        <div className="grid grid-cols-4 gap-4">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
      </div>
    </AdminGuard>
  );

  const pendingVerifications = verificationRequests.filter(r => r.status === "pending" || r.status === "under_review").length;
  const pendingCharities = charitySubmissions.filter(s => s.status === "submitted" || s.status === "under_review").length;
  const pendingWithdrawals = withdrawals.filter(w => w.status === "payment_submitted").length;
  const openReports = allReports.filter(r => r.status === "open").length;
  const totalDonations = donations.filter(d => d.status === "completed").reduce((s, d) => s + (d.amount || 0), 0);
  const verifiedUsers = allUsers.filter(u => u.is_verified).length;
  const totalAlerts = pendingVerifications + pendingCharities + pendingWithdrawals + openReports;

  const StatCard = ({ title, value, sub, icon: Icon, color }) => (
    <Card className={`border-${color}-200 bg-gradient-to-br from-${color}-50 to-white`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className={`text-sm font-medium text-${color}-900`}>{title}</CardTitle>
          <Icon className={`w-5 h-5 text-${color}-600`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className={`text-3xl font-bold text-${color}-700`}>{value}</div>
        {sub && <p className={`text-xs text-${color}-600 mt-1`}>{sub}</p>}
      </CardContent>
    </Card>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-purple-600 to-purple-700 p-2.5 rounded-xl">
            <Settings className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Master Admin</h1>
            <p className="text-slate-500 text-sm">Full platform management — owner access only</p>
          </div>
        </div>
        {totalAlerts > 0 && (
          <Badge className="bg-red-500 text-white text-sm px-3 py-1">
            <Bell className="w-3 h-3 mr-1" />{totalAlerts} action{totalAlerts !== 1 ? "s" : ""} required
          </Badge>
        )}
      </div>

      {/* Nav Tabs */}
      <div className="flex flex-wrap gap-2 mb-8 border-b border-slate-200 pb-4">
        {NAV_TABS.map(tab => {
          const alerts = tab.id === "verification" ? pendingVerifications
            : tab.id === "charities" ? pendingCharities
            : tab.id === "withdrawals" ? pendingWithdrawals
            : 0;
          return (
            <Button key={tab.id} variant={activeTab === tab.id ? "default" : "ghost"}
              onClick={() => setActiveTab(tab.id)}
              className={activeTab === tab.id ? "bg-purple-600 hover:bg-purple-700" : ""}>
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
              {alerts > 0 && <Badge className="ml-2 bg-red-500 text-white text-xs px-1.5 py-0">{alerts}</Badge>}
            </Button>
          );
        })}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === "overview" && (
        <div className="space-y-8">
          {canUsePanic && (
            <Card className="border-red-400 bg-red-950 border-2">
              <CardHeader>
                <CardTitle className="text-red-300 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5" />
                  PANIC MODE — Emergency Platform Lock
                </CardTitle>
                <p className="text-xs text-red-400">
                  Activates an immediate read-only lock across the entire platform.
                  Use only if you believe the platform is actively under attack.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  value={panicReason}
                  onChange={(e) => setPanicReason(e.target.value)}
                  placeholder="Reason for lockdown (optional)"
                  className="bg-red-900 text-red-100 border-red-700 placeholder:text-red-600"
                />
                <Button
                  onClick={activatePanic}
                  disabled={panicLoading}
                  className="bg-red-600 hover:bg-red-500 w-full font-bold uppercase tracking-widest"
                >
                  {panicLoading ? "Activating..." : "🚨 ACTIVATE PANIC MODE"}
                </Button>
                <Button
                  variant="outline"
                  onClick={deactivatePanic}
                  disabled={panicLoading}
                  className="w-full border-red-400 text-red-200 hover:bg-red-900"
                >
                  Deactivate panic mode
                </Button>
              </CardContent>
            </Card>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard title="Total Users" value={allUsers.length} sub={`${verifiedUsers} verified`} icon={Users} color="blue" />
            <StatCard title="Total Polls" value={allPolls.length} sub={`${allPolls.filter(p => p.status === "open").length} active`} icon={BarChart3} color="purple" />
            <StatCard title="Total Votes" value={allVotes.length} sub={`${allVotes.filter(v => new Date(v.created_date).toDateString() === new Date().toDateString()).length} today`} icon={CheckCircle2} color="green" />
            <StatCard title="Open Reports" value={openReports} sub={`${allReports.length} total`} icon={Flag} color="orange" />
            <StatCard title="Petitions" value={allPetitions.length} sub={`${allPetitions.filter(p => p.status === "active").length} active`} icon={FileText} color="indigo" />
            <StatCard title="Total Donations" value={`$${totalDonations.toFixed(0)}`} sub={`${donations.length} donations`} icon={Heart} color="pink" />
            <StatCard title="Verification Queue" value={pendingVerifications} sub="awaiting review" icon={Shield} color="amber" />
            <StatCard title="Charity Queue" value={pendingCharities} sub="awaiting review" icon={ClipboardList} color="cyan" />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-slate-200">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Activity className="w-5 h-5" />Platform Health</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: "User Verification Rate", value: allUsers.length > 0 ? `${((verifiedUsers / allUsers.length) * 100).toFixed(1)}%` : "0%", color: "text-emerald-600" },
                  { label: "Vote Trust Score", value: allVotes.length > 0 ? `${((allVotes.filter(v => v.is_verified_user).length / allVotes.length) * 100).toFixed(1)}%` : "0%", color: "text-blue-600" },
                  { label: "Report Rate", value: allPolls.length > 0 ? `${((allReports.length / allPolls.length) * 100).toFixed(1)} per 100 polls` : "0", color: "text-orange-600" },
                  { label: "Avg Votes per Poll", value: allPolls.length > 0 ? (allVotes.length / allPolls.length).toFixed(1) : "0", color: "text-purple-600" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                    <span className="text-sm text-slate-600">{item.label}</span>
                    <span className={`font-bold text-lg ${item.color}`}>{item.value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Bell className="w-5 h-5 text-red-500" />Action Required</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Verification Requests", count: pendingVerifications, tab: "verification", color: "bg-amber-50 border-amber-200 text-amber-800" },
                  { label: "Charity Submissions", count: pendingCharities, tab: "charities", color: "bg-cyan-50 border-cyan-200 text-cyan-800" },
                  { label: "Withdrawal Requests", count: pendingWithdrawals, tab: "withdrawals", color: "bg-blue-50 border-blue-200 text-blue-800" },
                  { label: "Open Reports", count: openReports, tab: null, color: "bg-orange-50 border-orange-200 text-orange-800" },
                ].map((item, i) => (
                  <div key={i}
                    className={`flex items-center justify-between p-3 rounded-lg border ${item.color} ${item.tab ? "cursor-pointer hover:opacity-80" : ""}`}
                    onClick={() => item.tab && setActiveTab(item.tab)}>
                    <span className="text-sm font-medium">{item.label}</span>
                    <Badge className={item.count > 0 ? "bg-red-500 text-white" : "bg-slate-200 text-slate-600"}>
                      {item.count}
                    </Badge>
                  </div>
                ))}

                <Separator />
                <div className="flex flex-col gap-2">
                  <Button variant="outline" size="sm" onClick={() => navigate(createPageUrl("AdminCharityReview"))}>
                    Open Charity Review Dashboard
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => navigate(createPageUrl("ModeratorDashboard"))}>
                    Open Moderation Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === "takedown" && (
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Scale className="w-5 h-5 text-blue-700" />Legal Complaints &amp; Notice and Takedown
          </h2>
          <TakedownPanel adminUser={user} />
        </div>
      )}

      {activeTab === "brigade" && (
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />Brigade Detection &amp; Report Abuse
          </h2>
          <BrigadePanel adminUser={user} />
        </div>
      )}

      {activeTab === "moderation" && (
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Flag className="w-5 h-5 text-orange-600" />Content Reports & Moderation
            {openReports > 0 && <Badge className="bg-red-500 text-white">{openReports} open</Badge>}
          </h2>
          <ModerationPanel adminUser={user} />
        </div>
      )}

      {activeTab === "verification" && (
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-600" />Verification Requests
            {pendingVerifications > 0 && <Badge className="bg-red-500 text-white">{pendingVerifications} pending</Badge>}
          </h2>
          <VerificationQueue />
        </div>
      )}

      {activeTab === "withdrawals" && (
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />Petition Withdrawal Requests
          </h2>
          <WithdrawalQueue />
        </div>
      )}

      {activeTab === "charities" && (
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Heart className="w-5 h-5 text-pink-600" />Charity Review Queue
          </h2>
          <p className="text-slate-600 mb-6">Full charity review is available in the dedicated dashboard.</p>
          <Button onClick={() => navigate(createPageUrl("AdminCharityReview"))} className="bg-pink-600 hover:bg-pink-700">
            <Heart className="w-4 h-4 mr-2" />Open Charity Review Dashboard
          </Button>
        </div>
      )}

      {activeTab === "petition_integrity" && (
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-600" />Petition Integrity Analytics
          </h2>
          <PetitionIntegritySelector adminUser={user} allPetitions={allPetitions} />
        </div>
      )}

      {activeTab === "deliveries" && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Send className="w-5 h-5 text-blue-600" />Petition Deliveries
            </h2>
            <Button variant="outline" size="sm" onClick={() => navigate(createPageUrl("AuthorityDirectoryAdmin"))}>
              <Building2 className="w-4 h-4 mr-2" />Manage Authority Directory
            </Button>
          </div>
          <PetitionDeliveryPanel adminUser={user} />
        </div>
      )}

      {activeTab === "media" && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Flame className="w-5 h-5 text-red-500" />Media Amplification
            </h2>
            <Button variant="outline" size="sm" onClick={() => navigate(createPageUrl("MediaAmplification"))}>
              Open Full Dashboard
            </Button>
          </div>
          <p className="text-slate-600 mb-4">Manage trending petitions, generate press releases, and approve media packages.</p>
          <Button onClick={() => navigate(createPageUrl("MediaAmplification"))} className="bg-red-600 hover:bg-red-700">
            <Flame className="w-4 h-4 mr-2" />Open Media Amplification Dashboard
          </Button>
        </div>
      )}

      {activeTab === "scorecards" && (
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500" />Scorecards Management
          </h2>
          <ScorecardAdminPanel />
        </div>
      )}

      {activeTab === "voting" && (
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />Public Voting Management
          </h2>
          <PublicVotingAdminPanel />
        </div>
      )}

      {activeTab === "reputation" && (
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />User Reputation & Influence Scores
          </h2>
          <ReputationAdminPanel />
        </div>
      )}

      {activeTab === "bank" && (
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Lock className="w-5 h-5 text-blue-600" />Bank Details Configuration
          </h2>
          <BankDetailsConfig />
        </div>
      )}

      {activeTab === "api" && (
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Globe2 className="w-5 h-5 text-blue-600" />Platform API & Key Management
          </h2>
          <ApiDashboard adminUser={user} />
        </div>
      )}

      {activeTab === "adaptive" && (
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-600" />Adaptive Engine — Self-Tuning Parameters
          </h2>
          <AdaptiveEnginePanel adminUser={user} />
        </div>
      )}

      {activeTab === "infrastructure" && (
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />Infrastructure & Platform Health
          </h2>
          <InfrastructurePanel adminUser={user} />
        </div>
      )}

      {activeTab === "federation" && (
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Globe2 className="w-5 h-5 text-indigo-600" />Federation Network — Connected Nodes
          </h2>
          <FederationPanel adminUser={user} />
        </div>
      )}

      {activeTab === "ledger" && (
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-600" />Verification Ledger
          </h2>
          <LedgerPanel adminUser={user} />
        </div>
      )}

      {activeTab === "creator_codes" && (
        <AdminCreatorCodesPanel />
      )}

      {activeTab === "referral_transactions" && (
        <AdminReferralPayoutsPanel />
      )}
    </div>
  );
}

function AdminCreatorCodesPanel() {
  const { data: codes = [], isLoading, refetch } = useQuery({
    queryKey: ["allCreatorCodes"],
    queryFn: () => api.entities.ReferralCode.list("-created_date", 200),
  });

  if (isLoading) return <div className="text-slate-500 text-sm">Loading...</div>;

  return (
    <div>
      <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
        <Gift className="w-5 h-5 text-purple-600" />Creator Referral Codes
      </h2>
      <div className="mb-4 text-sm text-slate-500">{codes.length} codes total</div>
      <div className="space-y-2">
        {codes.length === 0 && <p className="text-slate-400 text-sm">No codes found.</p>}
        {codes.map(c => (
          <div key={c.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-xl bg-white hover:bg-slate-50">
            <div>
              <p className="font-mono font-bold text-slate-900">{c.code}</p>
              <p className="text-xs text-slate-500">Owner: {c.owner_user_id} · Uses: {c.uses_count || 0}</p>
              <p className="text-xs text-slate-400">
                Discount: {c.discount_percent || 10}% · Commission: {c.commission_percent || 0}% · Tier: {c.subscription_status || "free_tier"}
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-emerald-700">Earned: ${(c.total_commission_earned || 0).toFixed(2)}</div>
              <div className="text-xs text-amber-600">Pending: ${(c.pending_commission || 0).toFixed(2)}</div>
              <span className={`text-xs px-2 py-0.5 rounded-full border mt-1 inline-block ${c.active ? "bg-green-50 text-green-700 border-green-200" : "bg-slate-100 text-slate-500 border-slate-200"}`}>
                {c.active ? "Active" : "Disabled"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminReferralPayoutsPanel() {
  const { data: txs = [], isLoading, refetch } = useQuery({
    queryKey: ["allReferralTxs"],
    queryFn: () => api.entities.ReferralTransaction.list("-created_date", 200),
  });

  const markPaid = async (txId) => {
    await api.entities.ReferralTransaction.update(txId, { status: "paid_out", paid_out_at: new Date().toISOString() });
    refetch();
  };

  const pending = txs.filter(t => t.status === "pending");
  const totalPending = pending.reduce((s, t) => s + (t.commission_amount_cents || 0) / 100, 0);

  if (isLoading) return <div className="text-slate-500 text-sm">Loading...</div>;

  return (
    <div>
      <h2 className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
        <CreditCard className="w-5 h-5 text-blue-600" />Referral Commission Payouts
      </h2>
      <p className="text-slate-500 text-sm mb-6">{pending.length} pending payouts · Total pending: <strong>${totalPending.toFixed(2)} AUD</strong></p>
      <div className="space-y-2">
        {txs.length === 0 && <p className="text-slate-400 text-sm">No transactions yet.</p>}
        {txs.map(tx => (
          <div key={tx.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-xl bg-white hover:bg-slate-50">
            <div>
              <p className="font-medium text-slate-900 text-sm">Code: <span className="font-mono">{tx.referral_code}</span></p>
              <p className="text-xs text-slate-500">Buyer: {tx.buyer_email} · Type: {tx.payment_type}</p>
              <p className="text-xs text-slate-400">
                Sale: ${(tx.final_amount_cents / 100).toFixed(2)} · Commission {tx.commission_percent}%
              </p>
            </div>
            <div className="text-right flex flex-col items-end gap-1">
              <span className="font-bold text-emerald-700">+${(tx.commission_amount_cents / 100).toFixed(2)}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full border ${
                tx.status === "paid_out" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : tx.status === "pending" ? "bg-amber-50 text-amber-700 border-amber-200"
                : "bg-slate-100 text-slate-500 border-slate-200"
              }`}>{tx.status}</span>
              {tx.status === "pending" && (
                <button
                  onClick={() => markPaid(tx.id)}
                  className="text-xs text-blue-600 hover:underline mt-1"
                >
                  Mark Paid Out
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}