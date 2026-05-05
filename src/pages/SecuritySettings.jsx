import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { cleanForDB } from "@/lib/dbHelpers";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Shield,
  Key,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Monitor,
  Bell,
  Lock,
  Mail,
  Phone,
  Send,
  Trash2,
  Smartphone,
  MessageSquare,
} from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useReAuth } from "@/components/ReAuthModal";
import DeleteAccountSection from "@/components/settings/DeleteAccountSection";
import LanguagePreferenceCard from "@/components/settings/LanguagePreferenceCard";
import {
  sendEmailVerification,
  verifyEmailOtp,
  sendPhoneVerification,
  verifyPhoneOtp,
} from "@/api/verificationApi";

export default function SecuritySettings() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { requireReAuth } = useReAuth();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [countryCode, setCountryCode] = useState("+1");
  const [phoneVerificationCode, setPhoneVerificationCode] = useState("");
  const [emailOtpCode, setEmailOtpCode] = useState("");
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);

  const [totpSetup, setTotpSetup] = useState(null);
  const [totpToken, setTotpToken] = useState("");
  const [totpLoading, setTotpLoading] = useState(false);
  const [totpStep, setTotpStep] = useState("idle");
  const [backupCodes, setBackupCodes] = useState([]);

  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [revokingId, setRevokingId] = useState(null);
  const [disable2faDialogOpen, setDisable2faDialogOpen] = useState(false);
  const [revokeAllDialogOpen, setRevokeAllDialogOpen] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const getAuthHeaders = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error("Not signed in");
    return { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" };
  };

  const callTotp = async (action, extra = {}) => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/totp-auth`, {
      method: "POST",
      headers,
      body: JSON.stringify({ action, ...extra }),
    });
    return res.json();
  };

  const handleSetup2FA = async () => {
    setTotpLoading(true);
    try {
      const data = await callTotp("setup");
      if (data.error) throw new Error(data.error);
      setTotpSetup(data);
      setTotpStep("setup");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setTotpLoading(false);
    }
  };

  const handleEnable2FA = async () => {
    if (!totpToken || totpToken.length !== 6) {
      toast.error("Enter the 6-digit code from your authenticator app.");
      return;
    }
    setTotpLoading(true);
    try {
      const data = await callTotp("enable", { token: totpToken });
      if (data.error) throw new Error(data.error);
      setBackupCodes(data.backup_codes || []);
      setTotpStep("enabled");
      setTotpToken("");
      toast.success("Two-factor authentication is now active!");
      await loadUser();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setTotpLoading(false);
    }
  };

  const disable2FAInternal = async () => {
    if (!totpToken || totpToken.length !== 6) {
      toast.error("Enter your 6-digit code to confirm.");
      return;
    }
    setTotpLoading(true);
    try {
      const data = await callTotp("disable", { token: totpToken });
      if (data.error) throw new Error(data.error);
      setTotpStep("idle");
      setTotpToken("");
      toast.success("2FA disabled.");
      await loadUser();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setTotpLoading(false);
    }
  };

  const openDisable2faDialog = () => {
    if (!totpToken || totpToken.length !== 6) {
      toast.error("Enter your 6-digit code to confirm.");
      return;
    }
    setDisable2faDialogOpen(true);
  };

  const confirmDisable2FA = async () => {
    setDisable2faDialogOpen(false);
    await requireReAuth(disable2FAInternal);
  };

  const loadSessions = async () => {
    setSessionsLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/session-manager`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "list" }),
      });
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch {
      /* non-blocking */
    } finally {
      setSessionsLoading(false);
    }
  };

  const revokeSession = async (sessionId) => {
    setRevokingId(sessionId);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/session-manager`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "revoke", session_id: sessionId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Revoke failed");
      }
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      toast.success("Session ended.");
    } catch (e) {
      toast.error(e.message || "Failed to revoke session");
    } finally {
      setRevokingId(null);
    }
  };

  const revokeAllSessionsInternal = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/session-manager`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "revoke_all" }),
      });
      setSessions((prev) => prev.filter((s) => s.is_current));
      toast.success("All other sessions ended.");
    } catch {
      toast.error("Failed to revoke sessions");
    }
  };

  const confirmRevokeAllSessions = async () => {
    setRevokeAllDialogOpen(false);
    await requireReAuth(revokeAllSessionsInternal);
  };

  useEffect(() => {
    if (user?.id) loadSessions();
  }, [user?.id]);

  const loadUser = async () => {
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) throw new Error("not auth");
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", authUser.id).maybeSingle();
      const currentUser = { ...authUser, ...(profile || {}) };
      setUser(currentUser);
      if (currentUser.phone_number || currentUser.phone) {
        setPhoneNumber(currentUser.phone_number || currentUser.phone);
      }
    } catch (error) {
      navigate(createPageUrl("Home"));
    } finally {
      setLoading(false);
    }
  };

  const resendEmailMutation = useMutation({
    mutationFn: async () => {
      await sendEmailVerification();
      setShowEmailVerification(true);
    },
    onSuccess: () => {
      toast.success("Verification code sent! Check your email.");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to send verification email");
    },
  });

  const verifyEmailMutation = useMutation({
    mutationFn: async (code) => {
      await verifyEmailOtp(code);
    },
    onSuccess: () => {
      toast.success("Email verified!");
      setShowEmailVerification(false);
      setEmailOtpCode("");
      queryClient.invalidateQueries(["user"]);
      loadUser();
    },
    onError: (error) => {
      toast.error(error.message || "Invalid code. Please try again.");
    },
  });

  const resubscribeMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("profiles").update(cleanForDB({
        email_notifications_enabled: true,
        unsubscribed_from_emails: false,
        opted_in_updates: true,
      })).eq("id", user.id);
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      toast.success("Successfully resubscribed to email notifications!");
      setUser({ ...user, unsubscribed_from_emails: false, email_notifications_enabled: true });
      queryClient.invalidateQueries(["user"]);
      loadUser();
    },
    onError: (error) => {
      console.error(error);
      toast.error("Failed to resubscribe. Please try again.");
    },
  });

  const sendPhoneVerificationMutation = useMutation({
    mutationFn: async () => {
      const fullPhone = `${countryCode}${phoneNumber}`;
      await sendPhoneVerification(fullPhone);
      setShowPhoneVerification(true);
      return fullPhone;
    },
    onSuccess: () => {
      toast.success("Verification code sent to your phone!");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to send verification code");
    },
  });

  const verifyPhoneMutation = useMutation({
    mutationFn: async (code) => {
      await verifyPhoneOtp(code);
    },
    onSuccess: () => {
      toast.success("Phone number verified!");
      setShowPhoneVerification(false);
      setPhoneVerificationCode("");
      queryClient.invalidateQueries(["user"]);
      loadUser();
    },
    onError: (error) => {
      toast.error(error.message || "Invalid verification code");
    },
  });

  const startIdentityVerificationMutation = useMutation({
    mutationFn: async () => {
      navigate(createPageUrl("IdentityVerification"));
    },
    onSuccess: () => {
      toast.success("Redirecting to identity verification...");
    },
  });

  const { data: securityLogs = [] } = useQuery({
    queryKey: ["securityLogs", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("security_audit_log")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error && (error.code === "42P01" || error.message?.includes("does not exist"))) return [];
      return data || [];
    },
    enabled: !!user,
  });

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Skeleton className="h-32 w-full mb-6" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const recentLoginAttempts = securityLogs.filter(
    log => log.event_type === 'login_success' || log.event_type === 'login_failed'
  );

  const isAccountLocked = user.account_locked_until && 
    new Date(user.account_locked_until) > new Date();

  const otherSessionCount = sessions.filter((s) => !s.is_current).length;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <AlertDialog open={disable2faDialogOpen} onOpenChange={setDisable2faDialogOpen}>
        <AlertDialogContent
          className="max-w-md"
          onKeyDown={(e) => {
            if (e.key === "Enter") e.preventDefault();
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Disable two-factor authentication?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600 space-y-2">
              <span className="block font-medium text-slate-800">
                Turning off 2FA significantly reduces your account security.
              </span>
              <span className="block">
                Anyone who knows your password could sign in without a second step. Only continue if you understand this
                risk.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
            <Button
              type="button"
              className="bg-red-600 hover:bg-red-700 text-white focus-visible:ring-red-600"
              onClick={() => void confirmDisable2FA()}
            >
              Disable 2FA
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={revokeAllDialogOpen} onOpenChange={setRevokeAllDialogOpen}>
        <AlertDialogContent
          className="max-w-md"
          onKeyDown={(e) => {
            if (e.key === "Enter") e.preventDefault();
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out all other devices?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600">
              You will end{" "}
              <strong>
                {otherSessionCount} other session{otherSessionCount === 1 ? "" : "s"}
              </strong>
              . Those devices will need to sign in again. This device stays signed in.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
            <Button type="button" variant="destructive" onClick={() => void confirmRevokeAllSessions()}>
              Sign out {otherSessionCount} session{otherSessionCount === 1 ? "" : "s"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-2.5 rounded-xl">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Security Settings</h1>
            <p className="text-slate-600">
              Manage your account security and privacy
            </p>
          </div>
        </div>
      </div>

      <LanguagePreferenceCard userId={user?.id} onSaved={loadUser} />

      {/* Account Status */}
      <Card className="border-slate-200 shadow-sm mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Account Security Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Email Verification */}
            <div className="p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Mail className={`w-4 h-4 ${user.is_email_verified ? 'text-emerald-500' : 'text-slate-400'}`} />
                  <span className="text-sm font-medium">Email Verified</span>
                </div>
                <Badge className={user.is_email_verified ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}>
                  {user.is_email_verified ? 'Verified' : 'Not Verified'}
                </Badge>
              </div>
              {!user.is_email_verified && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full mt-2"
                    onClick={() => resendEmailMutation.mutate()}
                    disabled={resendEmailMutation.isPending}
                  >
                    <Send className="w-3 h-3 mr-2" />
                    {resendEmailMutation.isPending ? "Sending..." : "Resend Verification Email"}
                  </Button>
                  {showEmailVerification && (
                    <div className="mt-2 space-y-2">
                      <Label className="text-xs text-slate-600">Enter the 6-digit code from your email:</Label>
                      <Input
                        type="text"
                        placeholder="123456"
                        value={emailOtpCode}
                        onChange={(e) => setEmailOtpCode(e.target.value)}
                        className="text-sm"
                        maxLength={6}
                      />
                      <Button
                        size="sm"
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        onClick={() => verifyEmailMutation.mutate(emailOtpCode)}
                        disabled={!emailOtpCode || verifyEmailMutation.isPending}
                      >
                        {verifyEmailMutation.isPending ? "Verifying..." : "Verify Email"}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Phone Verification */}
            <div className="p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Phone className={`w-4 h-4 ${user.is_phone_verified ? 'text-emerald-500' : 'text-slate-400'}`} />
                  <span className="text-sm font-medium">Phone Verified</span>
                </div>
                <Badge className={user.is_phone_verified ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}>
                  {user.is_phone_verified ? 'Verified' : 'Not Verified'}
                </Badge>
              </div>
              {!user.is_phone_verified && !showPhoneVerification && (
                <div className="mt-2 space-y-2">
                  <div className="flex gap-2">
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="flex h-9 w-24 rounded-md border border-slate-300 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950"
                    >
                      <option value="+1">🇺🇸 +1</option>
                      <option value="+44">🇬🇧 +44</option>
                      <option value="+61">🇦🇺 +61</option>
                      <option value="+91">🇮🇳 +91</option>
                      <option value="+86">🇨🇳 +86</option>
                      <option value="+81">🇯🇵 +81</option>
                      <option value="+49">🇩🇪 +49</option>
                      <option value="+33">🇫🇷 +33</option>
                      <option value="+39">🇮🇹 +39</option>
                      <option value="+34">🇪🇸 +34</option>
                      <option value="+7">🇷🇺 +7</option>
                      <option value="+55">🇧🇷 +55</option>
                      <option value="+27">🇿🇦 +27</option>
                      <option value="+52">🇲🇽 +52</option>
                      <option value="+82">🇰🇷 +82</option>
                      <option value="+62">🇮🇩 +62</option>
                      <option value="+63">🇵🇭 +63</option>
                      <option value="+66">🇹🇭 +66</option>
                      <option value="+84">🇻🇳 +84</option>
                      <option value="+60">🇲🇾 +60</option>
                      <option value="+65">🇸🇬 +65</option>
                      <option value="+64">🇳🇿 +64</option>
                      <option value="+20">🇪🇬 +20</option>
                      <option value="+234">🇳🇬 +234</option>
                      <option value="+254">🇰🇪 +254</option>
                      <option value="+92">🇵🇰 +92</option>
                      <option value="+880">🇧🇩 +880</option>
                      <option value="+90">🇹🇷 +90</option>
                      <option value="+966">🇸🇦 +966</option>
                      <option value="+971">🇦🇪 +971</option>
                      <option value="+972">🇮🇱 +972</option>
                      <option value="+48">🇵🇱 +48</option>
                      <option value="+31">🇳🇱 +31</option>
                      <option value="+32">🇧🇪 +32</option>
                      <option value="+41">🇨🇭 +41</option>
                      <option value="+43">🇦🇹 +43</option>
                      <option value="+45">🇩🇰 +45</option>
                      <option value="+46">🇸🇪 +46</option>
                      <option value="+47">🇳🇴 +47</option>
                      <option value="+358">🇫🇮 +358</option>
                      <option value="+353">🇮🇪 +353</option>
                      <option value="+351">🇵🇹 +351</option>
                      <option value="+30">🇬🇷 +30</option>
                      <option value="+420">🇨🇿 +420</option>
                      <option value="+40">🇷🇴 +40</option>
                      <option value="+36">🇭🇺 +36</option>
                      <option value="+380">🇺🇦 +380</option>
                      <option value="+54">🇦🇷 +54</option>
                      <option value="+56">🇨🇱 +56</option>
                      <option value="+57">🇨🇴 +57</option>
                      <option value="+51">🇵🇪 +51</option>
                      <option value="+58">🇻🇪 +58</option>
                    </select>
                    <Input
                      type="tel"
                      placeholder="555 123 4567"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/[^\d]/g, ''))}
                      className="text-sm flex-1"
                    />
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="w-full"
                    onClick={() => sendPhoneVerificationMutation.mutate()}
                    disabled={!phoneNumber || sendPhoneVerificationMutation.isPending}
                  >
                    <Send className="w-3 h-3 mr-2" />
                    {sendPhoneVerificationMutation.isPending ? "Sending..." : "Send Verification Code"}
                  </Button>
                </div>
              )}
              {showPhoneVerification && (
                <div className="mt-2 space-y-2">
                  <Label className="text-xs text-slate-600">Enter verification code:</Label>
                  <Input
                    type="text"
                    placeholder="123456"
                    value={phoneVerificationCode}
                    onChange={(e) => setPhoneVerificationCode(e.target.value)}
                    className="text-sm"
                    maxLength={6}
                  />
                  <Button 
                    size="sm" 
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => verifyPhoneMutation.mutate(phoneVerificationCode)}
                    disabled={!phoneVerificationCode || verifyPhoneMutation.isPending}
                  >
                    <CheckCircle2 className="w-3 h-3 mr-2" />
                    {verifyPhoneMutation.isPending ? "Verifying..." : "Verify Phone"}
                  </Button>
                </div>
              )}
            </div>

            {/* KYC Status */}
            <div className="p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Shield className={`w-4 h-4 ${user.kyc_status === 'verified' ? 'text-emerald-500' : 'text-slate-400'}`} />
                  <span className="text-sm font-medium">Identity Verified</span>
                </div>
                <Badge className={
                  user.kyc_status === 'verified' ? 'bg-emerald-50 text-emerald-700' :
                  user.kyc_status === 'pending' ? 'bg-amber-50 text-amber-700' :
                  'bg-slate-100 text-slate-600'
                }>
                  {user.kyc_status || 'not verified'}
                </Badge>
              </div>
              {user.kyc_status !== 'verified' && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="w-full mt-2"
                  onClick={() => startIdentityVerificationMutation.mutate()}
                >
                  <Shield className="w-3 h-3 mr-2" />
                  {user.kyc_status === 'pending' ? 'Check Verification Status' : 'Start Identity Verification'}
                </Button>
              )}
            </div>
          </div>

          {/* Account Lockout Warning */}
          {isAccountLocked && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Your account is temporarily locked due to multiple failed login attempts.
                Access will be restored on {format(new Date(user.account_locked_until), 'PPpp')}.
              </AlertDescription>
            </Alert>
          )}

          {/* Failed Login Attempts */}
          {user.failed_login_attempts > 0 && !isAccountLocked && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {user.failed_login_attempts} failed login attempt(s) detected recently.
                Your account will be temporarily locked after 5 failed attempts.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Password & Authentication */}
      <Card className="border-slate-200 shadow-sm mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Password & Authentication
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-slate-900">Password</h4>
              <p className="text-sm text-slate-600">
                Last changed: {user.last_password_change 
                  ? format(new Date(user.last_password_change), 'PPP')
                  : 'Never'}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.info("To change your password, sign out and use 'Forgot Password' on the login page.")}
            >
              Change Password
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Two-Factor Authentication (2FA)
          </CardTitle>
          <p className="text-sm text-slate-500">
            Use an authenticator app like Google Authenticator or Authy to protect your account.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {totpStep === "idle" && !user?.mfa_enabled && (
            <div className="space-y-3">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                Two-factor authentication is not enabled. Your account is protected by password only.
              </div>
              <Button
                onClick={handleSetup2FA}
                disabled={totpLoading}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {totpLoading ? "Setting up..." : "Set Up Two-Factor Authentication"}
              </Button>
            </div>
          )}

          {totpStep === "setup" && totpSetup && (
            <div className="space-y-4">
              <p className="text-sm text-slate-700">
                <strong>Step 1:</strong> Scan this QR code with your authenticator app (Google Authenticator, Authy, or
                1Password):
              </p>
              <div className="flex justify-center">
                <img
                  src={totpSetup.qr_url}
                  alt="TOTP QR Code"
                  className="w-48 h-48 border border-slate-200 rounded-lg"
                />
              </div>
              <p className="text-xs text-slate-500 text-center">
                Or enter manually:{" "}
                <code className="bg-slate-100 px-2 py-0.5 rounded font-mono text-xs">{totpSetup.secret}</code>
              </p>
              <p className="text-sm text-slate-700">
                <strong>Step 2:</strong> Enter the 6-digit code from your app to confirm:
              </p>
              <Input
                value={totpToken}
                onChange={(e) => setTotpToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                className="font-mono text-center text-2xl tracking-widest bg-white text-slate-900 border-slate-300"
                maxLength={6}
              />
              <Button
                onClick={handleEnable2FA}
                disabled={totpLoading || totpToken.length !== 6}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
              >
                {totpLoading ? "Verifying..." : "Activate 2FA"}
              </Button>
            </div>
          )}

          {totpStep === "enabled" && backupCodes.length > 0 && (
            <div className="space-y-3">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <p className="text-sm font-semibold text-emerald-800 mb-2">2FA is now active!</p>
                <p className="text-xs text-emerald-700">
                  Save these backup codes somewhere safe. Each code works once and can unlock your account if you lose
                  your phone.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-900 rounded-lg">
                {backupCodes.map((code, i) => (
                  <code key={i} className="text-emerald-400 font-mono text-sm text-center py-1">
                    {code}
                  </code>
                ))}
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  navigator.clipboard.writeText(backupCodes.join("\n"));
                  toast.success("Backup codes copied!");
                }}
              >
                Copy Backup Codes
              </Button>
              <Button className="w-full" onClick={() => setTotpStep("idle")}>
                I&apos;ve Saved My Codes
              </Button>
            </div>
          )}

          {user?.mfa_enabled && totpStep === "idle" && (
            <div className="space-y-3">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800">
                Two-factor authentication is active on your account.
              </div>
              <div className="space-y-2">
                <p className="text-xs text-slate-500">Enter your current 6-digit code to disable 2FA:</p>
                <Input
                  value={totpToken}
                  onChange={(e) => setTotpToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  className="font-mono bg-white text-slate-900 border-slate-300"
                  maxLength={6}
                />
                <Button
                  type="button"
                  onClick={openDisable2faDialog}
                  disabled={totpLoading || totpToken.length !== 6}
                  variant="outline"
                  className="w-full border-red-300 text-red-700 hover:bg-red-50"
                >
                  {totpLoading ? "Disabling..." : "Disable 2FA"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-base">
              <Monitor className="w-5 h-5" /> Active Sessions
            </span>
            {sessions.filter((s) => !s.is_current).length > 0 && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-red-300 text-red-600 text-xs"
                onClick={() => setRevokeAllDialogOpen(true)}
              >
                Sign Out All Other Devices
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sessionsLoading ? (
            <div className="text-sm text-slate-500 text-center py-4">Loading sessions...</div>
          ) : (
            <div className="space-y-2">
              {sessions.map((sessionRow) => (
                <div
                  key={sessionRow.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    sessionRow.is_current ? "bg-blue-50 border-blue-200" : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        sessionRow.is_current ? "bg-blue-100" : "bg-slate-200"
                      }`}
                    >
                      {sessionRow.device_label?.includes("iPhone") || sessionRow.device_label?.includes("Android") ? (
                        <Smartphone className="w-4 h-4 text-slate-600" />
                      ) : (
                        <Monitor className="w-4 h-4 text-slate-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {sessionRow.device_label || "Unknown device"}
                        {sessionRow.is_current && (
                          <span className="ml-2 text-xs text-blue-600 font-semibold">Current</span>
                        )}
                      </p>
                      <p className="text-xs text-slate-500">
                        {sessionRow.city && `${sessionRow.city}, `}
                        {sessionRow.country_code} · {sessionRow.ip_address}
                      </p>
                      <p className="text-xs text-slate-400">
                        Last active: {new Date(sessionRow.last_active_at).toLocaleString("en-AU")}
                      </p>
                    </div>
                  </div>
                  {!sessionRow.is_current && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600 hover:bg-red-50 h-8 w-8 p-0"
                      disabled={revokingId === sessionRow.id}
                      onClick={() => revokeSession(sessionRow.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              {sessions.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4">No active sessions found.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Activity */}
      <Card className="border-slate-200 shadow-sm mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Recent Security Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {securityLogs.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600">No recent security activity</p>
            </div>
          ) : (
            <div className="space-y-3">
              {securityLogs.slice(0, 10).map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg"
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    log.severity === 'critical' ? 'bg-red-100' :
                    log.severity === 'warning' ? 'bg-amber-100' :
                    'bg-blue-100'
                  }`}>
                    {log.event_type.includes('login') ? (
                      <Key className={`w-4 h-4 ${
                        log.severity === 'critical' ? 'text-red-600' :
                        log.severity === 'warning' ? 'text-amber-600' :
                        'text-blue-600'
                      }`} />
                    ) : (
                      <Shield className={`w-4 h-4 ${
                        log.severity === 'critical' ? 'text-red-600' :
                        log.severity === 'warning' ? 'text-amber-600' :
                        'text-blue-600'
                      }`} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-slate-900 text-sm">
                        {log.event_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                      <span className="text-xs text-slate-500">
                        {format(new Date(log.created_date), 'MMM d, HH:mm')}
                      </span>
                    </div>
                    {log.details && (
                      <p className="text-xs text-slate-600">
                        {JSON.stringify(log.details)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Account */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Message Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600 mb-3">
            Manage read receipts, message requests, blocked users, and conversation privacy.
          </p>
          <Button variant="outline" onClick={() => navigate(createPageUrl("MessageSettings"))}>
            Open Message Settings
          </Button>
        </CardContent>
      </Card>

      {/* Delete Account */}
      <DeleteAccountSection />

      {/* Security Notifications */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Email Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-slate-900">Security Alerts</h4>
              <p className="text-sm text-slate-600">
                Receive alerts about suspicious activity on your account
              </p>
            </div>
            <Badge className={user.security_notifications_enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}>
              {user.security_notifications_enabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-slate-900">Email Subscription Status</h4>
              <p className="text-sm text-slate-600">
                Platform updates and important notifications
              </p>
            </div>
            {user.unsubscribed_from_emails ? (
              <div className="flex items-center gap-2">
                <Badge className="bg-red-50 text-red-700">Unsubscribed</Badge>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => resubscribeMutation.mutate()}
                  disabled={resubscribeMutation.isPending}
                >
                  {resubscribeMutation.isPending ? "Resubscribing..." : "Resubscribe"}
                </Button>
              </div>
            ) : (
              <Badge className="bg-emerald-50 text-emerald-700">Subscribed</Badge>
            )}
          </div>

          {user.unsubscribed_from_emails && (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-900">
                You are currently unsubscribed from email notifications. Click "Resubscribe" above to start receiving important platform updates and security alerts.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}