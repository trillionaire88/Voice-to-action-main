
const BADGE_CONFIG = {
  user:         { color: "text-blue-500",    label: "Verified User",         title: "Verified User" },
  creator:      { color: "text-green-500",   label: "Verified Creator",      title: "Verified Creator" },
  business:     { color: "text-yellow-500",  label: "Verified Business",     title: "Verified Business" },
  organisation: { color: "text-blue-800",    label: "Verified Organisation", title: "Verified Organisation" },
  government:   { color: "text-red-600",     label: "Government",            title: "Verified Government" },
  council:      { color: "text-orange-500",  label: "Council",               title: "Verified Council" },
  admin:        { color: "text-purple-600",  label: "Admin",                 title: "Platform Administrator" },
  owner_admin:  { color: "text-purple-700",  label: "Platform Owner",        title: "Platform Owner" },
};

const COMMUNITY_BADGE_CONFIG = {
  business:     { color: "text-yellow-600",  bg: "bg-yellow-50 border-yellow-200",  label: "Verified Business" },
  organisation: { color: "text-blue-700",    bg: "bg-blue-50 border-blue-200",      label: "Verified Organisation" },
  government:   { color: "text-red-700",     bg: "bg-red-50 border-red-200",        label: "Government Page" },
  council:      { color: "text-orange-700",  bg: "bg-orange-50 border-orange-200",  label: "Official Council" },
  official:     { color: "text-slate-700",   bg: "bg-slate-50 border-slate-200",    label: "Official Page" },
};

function CheckIcon({ className }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
  );
}

const SIZE_MAP = { xs: "w-3 h-3", sm: "w-3.5 h-3.5", md: "w-5 h-5", lg: "w-6 h-6", xl: "w-7 h-7" };

export function UserVerificationBadge({ user, size = "sm", showLabel = false }) {
  if (!user) return null;
  const s = SIZE_MAP[size] || SIZE_MAP.sm;
  const hasBlueCheckmark = !!(
    user?.is_blue_verified ||
    user?.is_kyc_verified ||
    user?.paid_identity_verification_completed ||
    user?.is_verified ||
    user?.identity_verified
  );

  // Admin/owner override
  if (user.role === "admin" || user.role === "owner_admin" || user.verification_type === "admin" || user.verification_type === "owner_admin") {
    const cfg = BADGE_CONFIG.admin;
    return (
      <span title={cfg.title} className="inline-flex items-center gap-1">
        <CheckIcon className={`${s} text-purple-600`} />
        {showLabel && <span className="text-xs font-semibold text-purple-700">{cfg.label}</span>}
      </span>
    );
  }

  const vtype = user.verification_type;
  if (!vtype || vtype === "none") {
    if (hasBlueCheckmark) {
      return (
        <span title="Identity Verified" className="inline-flex items-center gap-1">
          <CheckIcon className={`${s} text-blue-500`} />
          {showLabel && <span className="text-xs font-semibold text-blue-600">Verified ✓</span>}
        </span>
      );
    }
    if (user.is_public_figure) {
      return (
        <span title="Public Figure" className="inline-flex items-center gap-1">
          <svg className={`${s} text-yellow-500`} fill="currentColor" viewBox="0 0 24 24"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" /></svg>
          {showLabel && <span className="text-xs font-semibold text-yellow-600">Public Figure ★</span>}
        </span>
      );
    }
    return null;
  }

  const cfg = BADGE_CONFIG[vtype];
  if (!cfg) return null;

  return (
    <span title={cfg.title} className="inline-flex items-center gap-1">
      <CheckIcon className={`${s} ${cfg.color}`} />
      {showLabel && <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>}
    </span>
  );
}

export function CommunityVerificationBadge({ community }) {
  if (!community) return null;
  const cvtype = community.community_verification;
  if (!cvtype || cvtype === "none") {
    if (!community.verified_community) return null;
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 border border-blue-200 rounded-full text-xs font-semibold text-blue-700">
        <CheckIcon className="w-3 h-3" /> Verified Community
      </span>
    );
  }
  const cfg = COMMUNITY_BADGE_CONFIG[cvtype];
  if (!cfg) return null;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 ${cfg.bg} border rounded-full text-xs font-semibold ${cfg.color}`}>
      <CheckIcon className="w-3 h-3" /> {cfg.label}
    </span>
  );
}

// Default export keeps backward compat
export default function VerificationBadge({ user, size = "sm", showLabel = false }) {
  return <UserVerificationBadge user={user} size={size} showLabel={showLabel} />;
}