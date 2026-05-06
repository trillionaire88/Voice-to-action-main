import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { getSafeReturnPath } from "@/lib/safeReturnPath";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import {
  FileText, Vote, Users, Shield, Globe2, TrendingUp,
  CheckCircle2, ArrowRight, Loader2, X
} from "lucide-react";

const FEATURES = [
  {
    icon: FileText,
    title: "Create Petitions",
    desc: "Launch campaigns that reach decision-makers and drive real change.",
  },
  {
    icon: Vote,
    title: "Public Polls",
    desc: "Voice your opinion on the issues that matter most to you.",
  },
  {
    icon: Users,
    title: "Civic Communities",
    desc: "Join groups of engaged citizens working toward shared goals.",
  },
  {
    icon: Shield,
    title: "Verified Accountability",
    desc: "Score public figures and institutions on their track record.",
  },
  {
    icon: Globe2,
    title: "Global Reach",
    desc: "Connect with activists and changemakers around the world.",
  },
  {
    icon: TrendingUp,
    title: "Real Impact",
    desc: "Track outcomes and see how collective action creates change.",
  },
];

const STATS = [
  { value: "50K+", label: "Active Members" },
  { value: "12K+", label: "Petitions Filed" },
  { value: "2M+", label: "Signatures Collected" },
  { value: "38", label: "Countries Represented" },
];

function AuthModal({ initialMode, onClose }) {
  const [mode, setMode] = useState(initialMode || "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const returnUrl = (() => {
    try {
      const p = new URLSearchParams(window.location.search);
      const path = getSafeReturnPath(p.get("return"), "/Home");
      return `${window.location.origin}${path}`;
    } catch {
      return `${window.location.origin}/Home`;
    }
  })();

  const onEmailSignIn = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { toast.error(error.message); return; }
      toast.success("Signed in!");
      window.location.assign(returnUrl);
    } catch (e) {
      toast.error(e.message || "Sign in failed");
    } finally {
      setBusy(false);
    }
  };

  const onSignUp = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/VerifyEmail`,
          data: { full_name: name || email.split("@")[0] },
        },
      });
      if (error) { toast.error(error.message); return; }
      toast.success("Account created! Check your email to verify your address.");
      navigate("/VerifyEmail");
    } catch (e) {
      toast.error(e.message || "Sign up failed");
    } finally {
      setBusy(false);
    }
  };

  const onForgotPassword = async () => {
    if (!email) { toast.error("Enter your email address first"); return; }
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/SecuritySettings`,
      });
      if (error) throw error;
      toast.success("Password reset email sent — check your inbox.");
    } catch (e) {
      toast.error(e.message || "Failed to send reset email");
    } finally {
      setBusy(false);
    }
  };

  const onGoogle = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: returnUrl },
      });
      if (error) throw error;
    } catch (e) {
      toast.error(e.message || "Google sign-in failed");
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 relative">
        {onClose && (
          <button
            type="button"
            className="absolute right-3 top-3 p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="mb-5">
          <h2 className="text-xl font-bold text-slate-900">
            {mode === "signup" ? "Join Voice to Action" : "Welcome back"}
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {mode === "signup"
              ? "Create your free account to start making change."
              : "Sign in to your account to continue."}
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full mb-4 gap-2"
          onClick={onGoogle}
          disabled={busy}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </Button>

        <div className="relative flex items-center mb-4">
          <div className="flex-1 border-t border-slate-200" />
          <span className="px-3 text-xs text-slate-400">or</span>
          <div className="flex-1 border-t border-slate-200" />
        </div>

        <div className="flex rounded-xl border border-slate-200 overflow-hidden mb-4">
          {["signin", "signup"].map((m) => (
            <button
              key={m}
              type="button"
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                mode === m
                  ? "bg-blue-600 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-50"
              }`}
              onClick={() => setMode(m)}
            >
              {m === "signin" ? "Sign in" : "Sign up"}
            </button>
          ))}
        </div>

        <form onSubmit={mode === "signin" ? onEmailSignIn : onSignUp} className="space-y-3">
          {mode === "signup" && (
            <div>
              <Label htmlFor="lp-name">Full name</Label>
              <Input
                id="lp-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Smith"
                autoComplete="name"
                className="mt-1"
              />
            </div>
          )}
          <div>
            <Label htmlFor="lp-email">Email address</Label>
            <Input
              id="lp-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              autoComplete="email"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="lp-password">Password</Label>
            <Input
              id="lp-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder={mode === "signin" ? "Your password" : "At least 6 characters"}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              className="mt-1"
            />
          </div>

          {mode === "signin" && (
            <button
              type="button"
              className="text-xs text-blue-600 hover:underline"
              onClick={onForgotPassword}
              disabled={busy}
            >
              Forgot password?
            </button>
          )}

          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {mode === "signin" ? "Sign in" : "Create account"}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated, isLoadingAuth } = useAuth();
  const navigate = useNavigate();
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState("signin");

  // If authenticated, redirect to Home
  useEffect(() => {
    if (!isLoadingAuth && isAuthenticated && user) {
      navigate(createPageUrl("Home"), { replace: true });
    }
  }, [isLoadingAuth, isAuthenticated, user, navigate]);

  // Auto-open auth modal if ?signin=1 or ?signup=1 param present
  useEffect(() => {
    if (searchParams.get("signin") === "1") {
      setAuthMode("signin");
      setShowAuth(true);
    } else if (searchParams.get("signup") === "1") {
      setAuthMode("signup");
      setShowAuth(true);
    }
  }, [searchParams]);

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-white pb-[72px] md:pb-0">
      {showAuth && (
        <AuthModal
          initialMode={authMode}
          onClose={() => setShowAuth(false)}
        />
      )}

      {/* Header */}
      <header className="border-b border-slate-100 bg-white/95 backdrop-blur-sm sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-4 h-16">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Globe2 className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-slate-900 text-lg">Voice to Action</span>
          </Link>
          <nav
            className="hidden md:flex flex-1 items-center justify-center gap-1 lg:gap-3 min-w-0"
            aria-label="Primary"
          >
            <Link
              to={createPageUrl("Home")}
              className="text-sm font-medium text-slate-600 hover:text-blue-600 px-2 py-1.5 rounded-lg whitespace-nowrap"
            >
              Home
            </Link>
            <Link
              to={createPageUrl("Petitions")}
              className="text-sm font-medium text-slate-600 hover:text-blue-600 px-2 py-1.5 rounded-lg whitespace-nowrap"
            >
              Petitions
            </Link>
            <Link
              to={createPageUrl("Discovery")}
              className="text-sm font-medium text-slate-600 hover:text-blue-600 px-2 py-1.5 rounded-lg whitespace-nowrap"
            >
              Polls
            </Link>
            <Link
              to={createPageUrl("Communities")}
              className="text-sm font-medium text-slate-600 hover:text-blue-600 px-2 py-1.5 rounded-lg whitespace-nowrap"
            >
              Communities
            </Link>
            <Link
              to={createPageUrl("About")}
              className="text-sm font-medium text-slate-600 hover:text-blue-600 px-2 py-1.5 rounded-lg whitespace-nowrap"
            >
              About
            </Link>
          </nav>
          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setAuthMode("signin"); setShowAuth(true); }}
            >
              Sign in
            </Button>
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => { setAuthMode("signup"); setShowAuth(true); }}
            >
              Get started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 px-4 sm:px-6 bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
            <CheckCircle2 className="w-4 h-4" />
            Civic accountability for everyone
          </div>
          <h1 className="text-5xl sm:text-6xl font-black text-slate-900 mb-6 leading-tight">
            Your voice.<br />
            <span className="text-blue-600">Real action.</span>
          </h1>
          <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto leading-relaxed">
            Voice to Action is the platform where citizens hold institutions accountable,
            launch petitions that drive real change, and build communities around the causes they care about.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 gap-2 text-base"
              onClick={() => { setAuthMode("signup"); setShowAuth(true); }}
            >
              Join for free <ArrowRight className="w-4 h-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="px-8 text-base"
              onClick={() => { setAuthMode("signin"); setShowAuth(true); }}
            >
              Sign in
            </Button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 border-y border-slate-100 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
          {STATS.map((s) => (
            <div key={s.label}>
              <div className="text-3xl font-black text-blue-600 mb-1">{s.value}</div>
              <div className="text-sm text-slate-500">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">
              Everything you need to make a difference
            </h2>
            <p className="text-slate-500 text-lg max-w-xl mx-auto">
              Powerful tools for civic action, all in one place.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="p-6 rounded-2xl border border-slate-200 hover:border-blue-200 hover:shadow-md transition-all"
                >
                  <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-2">{f.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 bg-blue-600">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to make your voice heard?
          </h2>
          <p className="text-blue-100 mb-8 text-lg">
            Join thousands of citizens already using Voice to Action.
          </p>
          <Button
            size="lg"
            className="bg-white text-blue-600 hover:bg-blue-50 px-10 gap-2 text-base font-semibold"
            onClick={() => { setAuthMode("signup"); setShowAuth(true); }}
          >
            Get started for free <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 sm:px-6 border-t border-slate-100">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-400">
          <span>© {new Date().getFullYear()} Voice to Action</span>
          <div className="flex gap-6">
            <a href="/PrivacyPolicy" className="hover:text-slate-600">Privacy Policy</a>
            <a href="/TermsOfService" className="hover:text-slate-600">Terms of Service</a>
            <a href="/About" className="hover:text-slate-600">About</a>
          </div>
        </div>
      </footer>

      <MobileBottomNav />
    </div>
  );
}
