import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Mail, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function VerifyEmail() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [checking, setChecking] = useState(true);
  const [verified, setVerified] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    // Check current session to see if email is already confirmed
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setEmail(session.user.email || "");
          if (session.user.email_confirmed_at) {
            setVerified(true);
            // Email already verified — redirect to Home after a moment
            setTimeout(() => navigate(createPageUrl("Home")), 2000);
          }
        }
      } catch {
        // ignore
      } finally {
        setChecking(false);
      }
    };
    checkSession();

    // Listen for auth state change — Supabase will fire this when the user
    // clicks the verification link and the token is exchanged automatically.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.email_confirmed_at) {
        setVerified(true);
        setEmail(session.user.email || "");
        toast.success("Email verified! Welcome to Voice to Action.");
        setTimeout(() => navigate(createPageUrl("Home")), 2000);
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const resendVerification = async () => {
    setResending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.email) {
        toast.error("No signed-in account found. Please sign in first.");
        return;
      }
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: session.user.email,
      });
      if (error) throw error;
      toast.success("Verification email resent — check your inbox.");
    } catch (e) {
      toast.error(e.message || "Failed to resend. Please try again.");
    } finally {
      setResending(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center px-4">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center px-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-12 pb-12 text-center">
          {verified ? (
            <>
              <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Email Verified!</h2>
              <p className="text-slate-600 mb-2">Your email has been verified successfully.</p>
              <p className="text-sm text-slate-400">Redirecting to the platform…</p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Check your email</h2>
              {email && (
                <p className="text-slate-600 mb-1">
                  We sent a verification link to{" "}
                  <span className="font-semibold text-slate-800">{email}</span>
                </p>
              )}
              <p className="text-slate-500 text-sm mb-6">
                Click the link in the email to verify your account and continue.
              </p>

              <div className="space-y-3">
                <Button
                  onClick={resendVerification}
                  disabled={resending}
                  variant="outline"
                  className="w-full"
                >
                  {resending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Resending…</>
                  ) : (
                    <><RefreshCw className="w-4 h-4 mr-2" /> Resend verification email</>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  className="w-full text-slate-500"
                  onClick={() => navigate("/")}
                >
                  Back to home
                </Button>
              </div>

              <p className="text-xs text-slate-400 mt-6">
                Didn't receive it? Check your spam folder, or try resending.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
