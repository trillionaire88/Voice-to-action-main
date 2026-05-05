import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import VerificationBadge from "./VerificationBadge";

// Badge overlay sizes per avatar size
const BADGE_POSITIONS = {
  sm:  "w-3 h-3 bottom-0 right-0",
  md:  "w-3.5 h-3.5 bottom-0 right-0",
  lg:  "w-4 h-4 bottom-0.5 right-0.5",
  xl:  "w-5 h-5 bottom-1 right-1",
};

export default function ProfileAvatar({ user, size = "md", className = "", showBadge = false }) {
  const sizes = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-16 h-16",
    xl: "w-24 h-24",
  };

  const avatarEl = user?.profile_avatar_url ? (
    <Avatar className={sizes[size]}>
      <AvatarImage src={user.profile_avatar_url} alt={user.display_name} />
      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
        {user.display_name?.[0]?.toUpperCase() || "U"}
      </AvatarFallback>
    </Avatar>
  ) : (
    <div className={`${sizes[size]} bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center`}>
      <span
        className="text-white font-semibold"
        style={{ fontSize: size === "xl" ? "2rem" : size === "lg" ? "1.5rem" : "1rem" }}
      >
        {user?.display_name?.[0]?.toUpperCase() || "U"}
      </span>
    </div>
  );

  return (
    <div className={`relative inline-flex flex-shrink-0 ${className}`}>
      {avatarEl}
      {showBadge && user && (
        <span className={`absolute ${BADGE_POSITIONS[size] || BADGE_POSITIONS.md} bg-white rounded-full p-px shadow`}>
          <VerificationBadge user={user} size={size === "xl" ? "lg" : size === "lg" ? "md" : "sm"} />
        </span>
      )}
    </div>
  );
}