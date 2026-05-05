import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function SuspiciousLoginBanner({ user }) {
  const [show, setShow] = useState(false);
  const [login, setLogin] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.id) return;
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    supabase
      .from("suspicious_logins")
      .select("*")
      .eq("user_id", user.id)
      .in("severity", ["high", "critical"])
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setLogin(data[0]);
          setShow(true);
        }
      });
  }, [user?.id]);

  if (!show || !login) return null;

  return (
    <div className="fixed top-16 left-0 right-0 z-50 px-4 py-2 pointer-events-none">
      <Alert className="border-red-300 bg-red-50 max-w-2xl mx-auto shadow-lg pointer-events-auto">
        <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
        <AlertDescription className="text-red-800 flex items-center justify-between gap-3 flex-wrap">
          <span className="text-sm">
            <strong>Security alert:</strong> A sign-in was detected from a new location.
            {login.country_code && ` (${login.country_code})`} If this wasn&apos;t you, secure your account now.
          </span>
          <div className="flex gap-2 shrink-0">
            <Button
              size="sm"
              className="bg-red-600 hover:bg-red-700 h-7 text-xs"
              onClick={() => navigate(createPageUrl("SecuritySettings"))}
            >
              Secure Account
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-red-600"
              onClick={() => setShow(false)}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}
