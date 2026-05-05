import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const ReAuthContext = createContext(null);
const FIVE_MIN = 5 * 60 * 1000;

export function ReAuthProvider({ children }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reAuthTimestamp, setReAuthTimestamp] = useState(0);
  const [pendingAction, setPendingAction] = useState(null);

  const isReAuthed = useMemo(() => Date.now() - reAuthTimestamp < FIVE_MIN, [reAuthTimestamp]);

  const requireReAuth = useCallback(
    async (onConfirmed) => {
      if (Date.now() - reAuthTimestamp < FIVE_MIN) {
        await onConfirmed();
        return;
      }
      setPendingAction(() => onConfirmed);
      setError("");
      setPassword("");
      setOpen(true);
    },
    [reAuthTimestamp],
  );

  const confirm = async () => {
    if (!user?.email || !password) return;
    setBusy(true);
    setError("");
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password,
      });
      if (authError) throw authError;
      setReAuthTimestamp(Date.now());
      setOpen(false);
      const cb = pendingAction;
      setPendingAction(null);
      if (cb) await cb();
      toast.success("Identity confirmed.");
    } catch {
      setError("Incorrect password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ReAuthContext.Provider value={{ requireReAuth, isReAuthed, reAuthTimestamp }}>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Your Password</DialogTitle>
            <DialogDescription>Re-authentication is required for this sensitive action.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={confirm} disabled={busy || !password}>
                {busy ? "Verifying..." : "Confirm"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </ReAuthContext.Provider>
  );
}

export function useReAuth() {
  const ctx = useContext(ReAuthContext);
  if (!ctx) throw new Error("useReAuth must be used within ReAuthProvider");
  return ctx;
}
