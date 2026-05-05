import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { X } from "lucide-react";

export default function LoginPanel({ onClose }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [mode, setMode] = useState("signin");
  const [busy, setBusy] = useState(false);

  const returnUrl = (() => {
    try {
      const p = new URLSearchParams(window.location.search);
      return p.get("return") || `${window.location.origin}/`;
    } catch {
      return `${window.location.origin}/`;
    }
  })();

  const onEmailSignIn = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Signed in");
      window.location.assign(returnUrl);
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
          emailRedirectTo: `${window.location.origin}/`,
          data: { full_name: name },
        },
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Check your email to confirm your account.");
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
      if (error) toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-slate-200 p-6 relative">
        {onClose && (
          <button
            type="button"
            className="absolute right-3 top-3 p-2 rounded-lg text-slate-500 hover:bg-slate-100"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        <h2 className="text-xl font-bold text-slate-900 mb-1 pr-8">
          {mode === "signin" ? "Sign in" : "Create account"}
        </h2>
        <p className="text-sm text-slate-500 mb-4">Use your email or Google to continue.</p>

        <Button type="button" variant="outline" className="w-full mb-4" onClick={onGoogle} disabled={busy}>
          Continue with Google
        </Button>

        <div className="flex gap-2 mb-4">
          <Button
            type="button"
            variant={mode === "signin" ? "default" : "ghost"}
            size="sm"
            className="flex-1"
            onClick={() => setMode("signin")}
          >
            Sign in
          </Button>
          <Button
            type="button"
            variant={mode === "signup" ? "default" : "ghost"}
            size="sm"
            className="flex-1"
            onClick={() => setMode("signup")}
          >
            Sign up
          </Button>
        </div>

        <form onSubmit={mode === "signin" ? onEmailSignIn : onSignUp} className="space-y-3">
          {mode === "signup" && (
            <div>
              <Label htmlFor="vta-name">Full name</Label>
              <Input
                id="vta-name"
                value={name}
                onChange={(ev) => setName(ev.target.value)}
                autoComplete="name"
                className="mt-1"
              />
            </div>
          )}
          <div>
            <Label htmlFor="vta-email">Email</Label>
            <Input
              id="vta-email"
              type="email"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              required
              autoComplete="email"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="vta-password">Password</Label>
            <Input
              id="vta-password"
              type="password"
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              required
              minLength={6}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              className="mt-1"
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {mode === "signin" ? "Sign in" : "Sign up"}
          </Button>
        </form>
      </div>
    </div>
  );
}
