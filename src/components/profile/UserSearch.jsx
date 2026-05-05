import React, { useState, useRef, useEffect } from "react";
import { api } from '@/api/client';
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, X } from "lucide-react";
import VerificationBadge from "./VerificationBadge";
import { useQuery } from "@tanstack/react-query";

export default function UserSearch({ className = "" }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const { data: results = [], isFetching } = useQuery({
    queryKey: ["userSearch", query],
    queryFn: async () => {
      if (query.trim().length < 2) return [];
      const all = await api.entities.User.list("-created_date", 100);
      const q = query.toLowerCase();
      return all.filter(u =>
        (u.full_name || "").toLowerCase().includes(q) ||
        (u.display_name || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q)
      ).slice(0, 8);
    },
    enabled: query.trim().length >= 2,
    staleTime: 10000,
  });

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (user) => {
    setQuery("");
    setOpen(false);
    navigate(createPageUrl("Profile") + `?userId=${user.id}`);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <Input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search users…"
          className="pl-9 pr-8"
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setOpen(false); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {open && query.trim().length >= 2 && (
        <div className="absolute z-50 mt-1 w-full bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden">
          {isFetching ? (
            <div className="px-4 py-3 text-sm text-slate-500">Searching…</div>
          ) : results.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-500">No users found</div>
          ) : (
            results.map(user => (
              <button
                key={user.id}
                onClick={() => handleSelect(user)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left"
              >
                <Avatar className="h-8 w-8 flex-shrink-0">
                  {user.profile_avatar_url && <AvatarImage src={user.profile_avatar_url} alt={user.full_name} />}
                  <AvatarFallback className="bg-blue-100 text-blue-700 text-xs font-semibold">
                    {(user.full_name?.[0] || "?").toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-slate-900 truncate">
                      {user.display_name || user.full_name}
                    </span>
                    <VerificationBadge user={user} size="sm" />
                    {(user.role === "admin" || user.role === "owner_admin") && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-medium">Admin</span>
                    )}
                  </div>
                  {user.bio && (
                    <p className="text-xs text-slate-400 truncate">{user.bio}</p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}