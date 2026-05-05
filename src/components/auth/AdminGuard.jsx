import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { api } from '@/api/client';
import { Shield, Lock } from "lucide-react";

const OWNER_EMAIL = "voicetoaction@outlook.com";

/**
 * AdminGuard — wraps any page/section that requires owner_admin or admin access.
 * Usage: <AdminGuard><YourAdminComponent /></AdminGuard>
 * ownerOnly prop: restrict to owner_admin + voicetoaction@outlook.com only
 */
export default function AdminGuard({ children, ownerOnly = false }) {
  const navigate = useNavigate();
  const [status, setStatus] = useState("checking"); // checking | allowed | denied

  useEffect(() => {
    api.auth.me()
      .then(user => {
        if (!user) { setStatus("denied"); navigate(createPageUrl("Home")); return; }

        const isOwner = user.role === "owner_admin" || (user.role === "admin" && user.email === OWNER_EMAIL);
        const isAdmin = user.role === "admin" || user.role === "moderator";

        if (ownerOnly && !isOwner) { setStatus("denied"); navigate(createPageUrl("Home")); return; }
        if (!ownerOnly && !isAdmin && !isOwner) { setStatus("denied"); navigate(createPageUrl("Home")); return; }

        setStatus("allowed");
      })
      .catch(() => { setStatus("denied"); navigate(createPageUrl("Home")); });
  }, []);

  if (status === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Shield className="w-10 h-10 animate-pulse text-blue-400" />
          <p className="text-sm">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (status === "denied") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Lock className="w-10 h-10 text-red-400" />
          <p className="text-sm font-medium text-red-600">Access Denied</p>
          <p className="text-xs">Redirecting...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}