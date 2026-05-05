import React, { useEffect, useState } from "react";
import { api } from '@/api/client';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EyeOff, ShieldCheck } from "lucide-react";
import VerificationBadge from "@/components/profile/VerificationBadge";

/**
 * Shows the petition creator card.
 * - If creator_visible = true OR viewer is admin/creator: shows full profile.
 * - Otherwise: shows anonymous placeholder.
 */
export default function PetitionCreatorCard({ petition, viewerUser }) {
  const [creator, setCreator] = useState(null);

  const isAdmin = viewerUser?.role === "admin" || viewerUser?.role === "owner_admin";
  const isCreator = viewerUser && viewerUser.id === petition?.creator_user_id;
  const showIdentity = petition?.creator_visible !== false || isAdmin || isCreator;

  useEffect(() => {
    if (!petition?.creator_user_id || !showIdentity) return;
    api.entities.User.filter({ id: petition.creator_user_id })
      .then(users => { if (users.length > 0) setCreator(users[0]); })
      .catch(() => {});
  }, [petition?.creator_user_id, showIdentity]);

  if (!petition?.creator_user_id) return null;

  return (
    <div className="flex items-center gap-3 py-3 px-4 bg-slate-50 rounded-xl border border-slate-200">
      {showIdentity ? (
        <>
          <Avatar className="h-9 w-9 flex-shrink-0">
            {creator?.profile_avatar_url && (
              <AvatarImage src={creator.profile_avatar_url} alt={creator.full_name} />
            )}
            <AvatarFallback className="bg-blue-100 text-blue-700 text-sm font-semibold">
              {(creator?.full_name?.[0] || "?").toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-semibold text-slate-900 truncate">
                {creator?.full_name || "Loading…"}
              </span>
              {creator && <VerificationBadge user={creator} size="sm" />}
              {(isAdmin || isCreator) && petition?.creator_visible === false && (
                <Badge className="text-xs bg-amber-50 text-amber-700 border-amber-200 gap-1">
                  <EyeOff className="w-3 h-3" /> Hidden from public
                </Badge>
              )}
              {isAdmin && !isCreator && (
                <Badge className="text-xs bg-purple-50 text-purple-700 border-purple-200 gap-1">
                  <ShieldCheck className="w-3 h-3" /> Admin view
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-500">Petition creator</p>
          </div>
        </>
      ) : (
        <>
          <div className="h-9 w-9 flex-shrink-0 rounded-full bg-slate-200 flex items-center justify-center">
            <EyeOff className="w-4 h-4 text-slate-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-600">Voice to Action user</p>
            <p className="text-xs text-slate-400">Creator identity is private</p>
          </div>
        </>
      )}
    </div>
  );
}