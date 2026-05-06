import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/lib/AuthContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { api } from '@/api/client';
import { supabase } from "@/lib/supabase";
import { Globe2, User, LogOut, Lock, FileText, ChevronDown, PlusCircle, Vote, MessageSquare, Users, ArrowLeft } from "lucide-react";
import { useNavigation } from "@/lib/NavigationContext";
import VerificationBadge from "@/components/profile/VerificationBadge";
import ToSGate from "@/components/legal/ToSGate";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import CookieConsent from "@/components/legal/CookieConsent";
import PushNotificationPrompt from "@/components/notifications/PushNotificationPrompt";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import NotificationCenter from "@/components/notifications/NotificationCenter";
import { HEADER_TABS, MORE_DROPDOWN_TABS, ALL_TABS, getTabHref, isTabLocationActive } from "@/components/header/tabRegistry";
import { useScrollRestore } from "@/hooks/useScrollRestore";
import MobileBottomSheet, { SheetItem, SheetSeparator } from "@/components/ui/MobileBottomSheet";
import SuspiciousLoginBanner from "@/components/security/SuspiciousLoginBanner";
// import SessionExpiryWarning from "@/components/SessionExpiryWarning"; // TODO: re-enable as toast when needed
import PaymentErrorBanner from "@/components/payments/PaymentErrorBanner";
import { queryClientInstance } from "@/lib/query-client";
// import CookieConsentBanner from "@/components/legal/CookieConsentBanner"; // TODO: re-enable after mobile layout stabilises
// import InstallPrompt from "@/components/pwa/InstallPrompt"; // TODO: re-enable later
import PageWrapper from "@/components/layout/PageWrapper";

function isUserAdmin(user) {
  if (!user) return false;
  return user?.role === "owner_admin" || user?.role === "admin";
}

function isUserModerator(user) {
  if (!user) return false;
  return user?.role === "moderator" || user?.role === "admin" || user?.role === "owner_admin";
}

function filterTabs(tabs, user) {
  return tabs.filter(t => {
    if (t.adminOnly && !isUserAdmin(user)) return false;
    if (t.modOnly && !isUserModerator(user)) return false;
    if (t.requiresAuth && !user) return false;
    return true;
  });
}

const COMING_SOON_TAB_KEYS = new Set([
  "PeoplesTribunal", "MandateLedger", "ElectionIntegrity", "HumanRightsBarometer", "ParliamentaryWatch",
]);

const WIDE_LAYOUT_PATHS = new Set([
  "/Messages",
  "/Newsfeed",
  "/Discovery",
  "/WorldView",
  "/CivicMap",
  "/Petitions",
  "/PressKit",
  "/OrganisationDashboard",
  "/AdminDashboard",
  "/MasterAdmin",
  "/ComplianceDashboard",
  "/FinanceDashboard",
  "/RiskMonitor",
  "/DeepAnalytics",
]);

function getOrderedNavTabs(user) {
  const main = filterTabs(HEADER_TABS, user);
  const more = filterTabs(MORE_DROPDOWN_TABS, user);
  const defaultOrder = [...main, ...more];
  if (!user?.id) return defaultOrder;
  try {
    const raw = localStorage.getItem(`header_tabs_${user.id}`);
    if (!raw) return defaultOrder;
    const { enabled, hidden } = JSON.parse(raw);
    const hiddenSet = new Set(Array.isArray(hidden) ? hidden : []);
    const allFiltered = filterTabs(ALL_TABS, user);
    const byKey = new Map(allFiltered.map(t => [t.key, t]));
    const out = [];
    if (Array.isArray(enabled)) {
      for (const key of enabled) {
        if (hiddenSet.has(key)) continue;
        const t = byKey.get(key);
        if (t) out.push(t);
      }
    }
    for (const t of allFiltered) {
      if (hiddenSet.has(t.key)) continue;
      if (!out.some(x => x.key === t.key)) out.push(t);
    }
    return out.length ? out : defaultOrder;
  } catch {
    return defaultOrder;
  }
}

// Root routes where the logo/home button shows (no back arrow)
const ROOT_ROUTES = new Set([
  "/Home", "/Discovery", "/Petitions", "/Communities", "/", "/WorldView",
  "/PublicFigures", "/Scorecards", "/PolicyDiscussions", "/ThematicWorlds",
]);

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { goBack, dispatch } = useNavigation();
  useScrollRestore(); // Saves & restores scroll position per route
  const [createSheetOpen, setCreateSheetOpen] = useState(false);
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);
  const [userSheetOpen, setUserSheetOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [navEpoch, setNavEpoch] = useState(0);
  const [maxInlineTabs, setMaxInlineTabs] = useState(12);

  useEffect(() => {
    const bump = () => setNavEpoch((n) => n + 1);
    window.addEventListener("ev-header-tabs-saved", bump);
    return () => window.removeEventListener("ev-header-tabs-saved", bump);
  }, []);

  useEffect(() => {
    const q = () => setMaxInlineTabs(typeof window !== "undefined" && window.innerWidth >= 1280 ? 16 : 12);
    q();
    window.addEventListener("resize", q);
    return () => window.removeEventListener("resize", q);
  }, []);

  const orderedNavTabs = useMemo(() => getOrderedNavTabs(user), [user, navEpoch]);
  const inlineNavTabs = orderedNavTabs.slice(0, maxInlineTabs);
  const moreNavTabs = orderedNavTabs.slice(maxInlineTabs);

  const widePageLayout = WIDE_LAYOUT_PATHS.has(location.pathname);

  const isNestedRoute = !ROOT_ROUTES.has(location.pathname);

  useEffect(() => {
    const refreshUnread = async () => {
      if (!user?.id) return setUnreadCount(0);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return setUnreadCount(0);
      const { data } = await supabase
        .from("conversation_participants")
        .select("last_read_at, conversations:conversations(last_message_at,last_message_sender_id)")
        .eq("user_id", user.id);
      const count = (data || []).filter((row) => {
        const last = row.conversations?.last_message_at;
        return last && new Date(last) > new Date(row.last_read_at || 0);
      }).length;
      setUnreadCount(count);
    };

    if (!user) {
      setUnreadCount(0);
      return;
    }
    refreshUnread().catch(() => setUnreadCount(0));
    const interval = setInterval(() => {
      refreshUnread().catch(() => setUnreadCount(0));
    }, 30000);
    const realtime = supabase
      .channel(`layout-unread:${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => refreshUnread())
      .on("postgres_changes", { event: "*", schema: "public", table: "conversation_participants", filter: `user_id=eq.${user.id}` }, () => refreshUnread())
      .subscribe();
    return () => {
      clearInterval(interval);
      supabase.removeChannel(realtime);
    };
  }, [user]);

  const handleLogout = useCallback(() => {
    sessionStorage.clear();
    logout(true);
  }, [logout]);

  const prefetchTabData = useCallback((tabKey) => {
    if (tabKey === "Petitions") {
      queryClientInstance.prefetchQuery({
        queryKey: ["petitions-prefetch"],
        queryFn: () => supabase.from("petitions").select("id,title,status,created_date").eq("status", "active").order("created_date", { ascending: false }).limit(20),
        staleTime: 3 * 60 * 1000,
      });
    } else if (tabKey === "Discovery") {
      queryClientInstance.prefetchQuery({
        queryKey: ["discovery-prefetch"],
        queryFn: () => supabase.from("polls").select("id,question,created_date").order("created_date", { ascending: false }).limit(20),
        staleTime: 3 * 60 * 1000,
      });
    } else if (tabKey === "Communities") {
      queryClientInstance.prefetchQuery({
        queryKey: ["communities-prefetch"],
        queryFn: () => supabase.from("communities").select("id,name,member_count").eq("is_hidden", false).limit(20),
        staleTime: 3 * 60 * 1000,
      });
    } else if (tabKey === "PublicFigures") {
      queryClientInstance.prefetchQuery({
        queryKey: ["figures-prefetch"],
        queryFn: () => supabase.from("public_profiles_view").select("id,full_name,is_blue_verified").eq("is_blue_verified", true).limit(20),
        staleTime: 3 * 60 * 1000,
      });
    } else if (tabKey === "Scorecards") {
      queryClientInstance.prefetchQuery({
        queryKey: ["scorecards-prefetch"],
        queryFn: () => supabase.from("scorecards").select("id,subject_name,overall_score").order("created_date", { ascending: false }).limit(20),
        staleTime: 3 * 60 * 1000,
      });
    }
  }, []);

  return (
    <ToSGate user={user}>
      <div className="w-full min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
        <div id="ev-ownership-marker" style={{ display: "none" }} data-platform="Voice to Action" />

        <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
          <div className="max-w-screen-2xl mx-auto px-3">
            <div className="flex items-center gap-2 min-h-14 h-14">
              {/* Logo / Back button */}
              {isNestedRoute ? (
                <button
                  onClick={goBack}
                  className="flex items-center gap-2 text-slate-700 hover:text-blue-700 transition-colors flex-shrink-0 px-2 py-2 rounded-lg hover:bg-blue-50 min-h-[44px] min-w-[44px]"
                  aria-label="Go back"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span className="text-sm font-semibold hidden sm:inline">Back</span>
                </button>
              ) : (
                <Link to={createPageUrl("Home")} className="flex items-center gap-2 sm:gap-3 group flex-shrink-0 min-w-0">
                  <div className="relative flex-shrink-0">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl blur-sm opacity-50 group-hover:opacity-75 transition-opacity" />
                    <div className="relative bg-gradient-to-br from-blue-600 to-blue-700 p-2 sm:p-3 rounded-2xl">
                      <Globe2 className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                    </div>
                  </div>
                  <div className="hidden sm:flex flex-col min-w-0">
                    <h1 className="text-lg sm:text-2xl font-extrabold text-blue-900 leading-none truncate">Voice to Action</h1>
                    <p className="text-xs text-slate-500 font-medium mt-0.5 hidden md:block">Secure Global Opinion</p>
                  </div>
                </Link>
              )}

              {/* Desktop nav — wraps to two rows; overflow into More */}
              <nav className="hidden md:flex flex-1 min-w-0 overflow-hidden items-center">
                <div className="flex flex-wrap items-center gap-0 justify-end w-full">
                  {inlineNavTabs.map(tab => {
                    const TabIcon = tab.icon;
                    const active = isTabLocationActive(tab, location);
                    const href = getTabHref(tab);
                    return (
                      <Link key={tab.key} to={href} className="shrink-0" onMouseEnter={() => prefetchTabData(tab.key)}>
                        <Button variant="ghost" size="sm" className={`text-xs px-2 py-1.5 h-8 whitespace-nowrap inline-flex ${active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"}`}>
                          <TabIcon className="w-3.5 h-3.5 mr-1" />{tab.label}
                          {tab.key === "Messages" && unreadCount > 0 && (
                            <span className="ml-1 inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-blue-600 text-white text-[10px] font-bold">
                              {unreadCount > 99 ? "99+" : unreadCount}
                            </span>
                          )}
                        </Button>
                      </Link>
                    );
                  })}
                  {moreNavTabs.length > 0 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-xs px-2 py-1.5 h-8 text-slate-600 hover:text-slate-900 hover:bg-slate-50 whitespace-nowrap shrink-0">
                          More <ChevronDown className="w-3.5 h-3.5 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 max-h-96 overflow-y-auto">
                        {moreNavTabs.map(tab => {
                          const TabIcon = tab.icon;
                          const isSoon = COMING_SOON_TAB_KEYS.has(tab.key);
                          return (
                            <DropdownMenuItem key={tab.key} onClick={() => { const p = getTabHref(tab); dispatch({ type: "PUSH", tabKey: tab.key, path: p }); navigate(p); }} className={isTabLocationActive(tab, location) ? "bg-blue-50 text-blue-700" : ""}>
                              <TabIcon className="w-4 h-4 mr-2" />
                              <span className="flex-1">{tab.label}</span>
                              {tab.key === "Messages" && unreadCount > 0 && (
                                <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full font-semibold ml-1 flex-shrink-0">
                                  {unreadCount > 99 ? "99+" : unreadCount}
                                </span>
                              )}
                              {isSoon && <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-semibold ml-1 flex-shrink-0">SOON</span>}
                            </DropdownMenuItem>
                          );
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </nav>

              {/* Create dropdown — desktop */}
              {user && (
                <>
                  <div className="hidden md:block flex-shrink-0">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5">
                          <PlusCircle className="w-4 h-4" /> Create <ChevronDown className="w-3 h-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => { dispatch({ type: "PUSH", tabKey: "CreatePoll", path: createPageUrl("CreatePoll") }); navigate(createPageUrl("CreatePoll")); }}><Vote className="w-4 h-4 mr-2 text-blue-500" />Create Poll</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { dispatch({ type: "PUSH", tabKey: "CreatePoll", path: createPageUrl("CreatePetition") }); navigate(createPageUrl("CreatePetition")); }}><FileText className="w-4 h-4 mr-2 text-emerald-500" />Create Petition</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { dispatch({ type: "PUSH", tabKey: "CreatePoll", path: createPageUrl("PolicyDiscussions") }); navigate(createPageUrl("PolicyDiscussions")); }}><MessageSquare className="w-4 h-4 mr-2 text-purple-500" />Create Discussion</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { dispatch({ type: "PUSH", tabKey: "CreatePoll", path: createPageUrl("CreateCommunity") }); navigate(createPageUrl("CreateCommunity")); }}><Users className="w-4 h-4 mr-2 text-amber-500" />Create Community</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </>
              )}

              {/* Right side */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <>
                    {user ? (
                      <div className="flex items-center gap-1">
                        {/* Notifications */}
                        <div className="flex-shrink-0">
                          <NotificationCenter />
                        </div>
                        {/* Desktop user dropdown */}
                    <div className="hidden md:block flex-shrink-0">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="flex items-center gap-2 hover:bg-slate-50 px-2 flex-shrink-0">
                            <Avatar className="h-7 w-7 bg-gradient-to-br from-blue-500 to-blue-600 flex-shrink-0">
                              {user.profile_avatar_url && <AvatarImage src={user.profile_avatar_url} alt={user.full_name} />}
                              <AvatarFallback className="bg-transparent text-white text-xs font-semibold">
                                {user.full_name?.[0]?.toUpperCase() || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="hidden lg:block text-left min-w-0">
                              <div className="flex items-center gap-1">
                                <span className="text-sm font-medium text-slate-900 max-w-[80px] truncate">{user.full_name}</span>
                                <VerificationBadge user={user} size="sm" />
                              </div>
                            </div>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <div className="px-2 py-2">
                            <p className="text-sm font-medium">{user.full_name}</p>
                            <p className="text-xs text-slate-500">{user.email}</p>
                            <div className="flex gap-1 mt-1">
                              <VerificationBadge user={user} size="sm" showLabel={true} />
                              {user.mfa_enabled && <Badge className="text-xs bg-blue-50 text-blue-700 border-blue-200"><Lock className="w-3 h-3 mr-1" />2FA</Badge>}
                            </div>
                          </div>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => { dispatch({ type: "PUSH", tabKey: "Profile", path: createPageUrl("Profile") }); navigate(createPageUrl("Profile")); }}><User className="w-4 h-4 mr-2" />My Profile</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { dispatch({ type: "PUSH", tabKey: "Messages", path: "/Messages" }); navigate("/Messages"); }}><MessageSquare className="w-4 h-4 mr-2" />Messages</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { dispatch({ type: "PUSH", tabKey: "Profile", path: createPageUrl("SecuritySettings") }); navigate(createPageUrl("SecuritySettings")); }}><Lock className="w-4 h-4 mr-2" />Security Settings</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { dispatch({ type: "PUSH", tabKey: "Profile", path: createPageUrl("LegalSettings") }); navigate(createPageUrl("LegalSettings")); }}><FileText className="w-4 h-4 mr-2" />Legal & Policies</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={handleLogout}><LogOut className="w-4 h-4 mr-2" />Sign Out</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    {/* Mobile user avatar (opens bottom sheet) */}
                    <button
                      className="md:hidden flex items-center justify-center"
                      style={{ minWidth: 44, minHeight: 44 }}
                      aria-label="Open user menu"
                      onClick={() => setUserSheetOpen(true)}
                    >
                      <Avatar className="h-8 w-8 bg-gradient-to-br from-blue-500 to-blue-600">
                        {user.profile_avatar_url && <AvatarImage src={user.profile_avatar_url} alt={user.full_name} />}
                        <AvatarFallback className="bg-transparent text-white text-xs font-semibold">
                          {user.full_name?.[0]?.toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => api.auth.redirectToLogin(createPageUrl("Home"))} className="text-slate-600">Sign In</Button>
                        <Button size="sm" onClick={() => api.auth.redirectToLogin(createPageUrl("Home"))} className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white">Get Started</Button>
                      </div>
                    )}
                  </>
              </div>
            </div>
          </div>

        </header>
        <PaymentErrorBanner />
        {/* <SessionExpiryWarning /> */}

        {user && <SuspiciousLoginBanner user={user} />}

        <main id="main-content" className="min-h-[calc(100vh-4rem)] pb-main md:pb-0" tabIndex="-1">
          <PageWrapper wide={widePageLayout} className="!min-h-[calc(100vh-4rem)] md:!pb-8">
            <ErrorBoundary>{children}</ErrorBoundary>
          </PageWrapper>
        </main>
        <MobileBottomNav user={user} unreadCount={unreadCount} />
        <CookieConsent />
        {/* <CookieConsentBanner /> */}
        {/* <InstallPrompt /> */}
        <PushNotificationPrompt />

        {/* ── Mobile Bottom Sheets ───────────────────────────── */}

        {/* Create sheet */}
        <MobileBottomSheet open={createSheetOpen} onClose={() => setCreateSheetOpen(false)} title="Create">
          <SheetItem icon={Vote} label="Create Poll" onClick={() => { setCreateSheetOpen(false); dispatch({ type: "PUSH", tabKey: "CreatePoll", path: createPageUrl("CreatePoll") }); navigate(createPageUrl("CreatePoll")); }} />
          <SheetItem icon={FileText} label="Create Petition" onClick={() => { setCreateSheetOpen(false); dispatch({ type: "PUSH", tabKey: "CreatePoll", path: createPageUrl("CreatePetition") }); navigate(createPageUrl("CreatePetition")); }} />
          <SheetItem icon={MessageSquare} label="Create Discussion" onClick={() => { setCreateSheetOpen(false); dispatch({ type: "PUSH", tabKey: "CreatePoll", path: createPageUrl("PolicyDiscussions") }); navigate(createPageUrl("PolicyDiscussions")); }} />
          <SheetItem icon={Users} label="Create Community" onClick={() => { setCreateSheetOpen(false); dispatch({ type: "PUSH", tabKey: "CreatePoll", path: createPageUrl("CreateCommunity") }); navigate(createPageUrl("CreateCommunity")); }} />
        </MobileBottomSheet>

        {/* More / nav sheet */}
        <MobileBottomSheet open={moreSheetOpen} onClose={() => setMoreSheetOpen(false)} title="More">
          {moreNavTabs.map((tab) => {
            const TabIcon = tab.icon;
            return (
              <SheetItem
                key={tab.key}
                icon={TabIcon}
                label={tab.label}
                badge={COMING_SOON_TAB_KEYS.has(tab.key) ? "SOON" : undefined}
                onClick={() => { const p = getTabHref(tab); setMoreSheetOpen(false); dispatch({ type: "PUSH", tabKey: tab.key, path: p }); navigate(p); }}
              />
            );
          })}
        </MobileBottomSheet>

        {/* User sheet */}
        {user && (
          <MobileBottomSheet open={userSheetOpen} onClose={() => setUserSheetOpen(false)} title={user.full_name}>
            <SheetItem icon={User} label="My Profile" onClick={() => { setUserSheetOpen(false); dispatch({ type: "PUSH", tabKey: "Profile", path: createPageUrl("Profile") }); navigate(createPageUrl("Profile")); }} />
            <SheetItem icon={MessageSquare} label="Messages" onClick={() => { setUserSheetOpen(false); dispatch({ type: "PUSH", tabKey: "Messages", path: "/Messages" }); navigate("/Messages"); }} />
            <SheetItem icon={Lock} label="Security Settings" onClick={() => { setUserSheetOpen(false); dispatch({ type: "PUSH", tabKey: "Profile", path: createPageUrl("SecuritySettings") }); navigate(createPageUrl("SecuritySettings")); }} />
            <SheetItem icon={FileText} label="Legal & Policies" onClick={() => { setUserSheetOpen(false); dispatch({ type: "PUSH", tabKey: "Profile", path: createPageUrl("LegalSettings") }); navigate(createPageUrl("LegalSettings")); }} />
            <SheetSeparator />
            <SheetItem icon={LogOut} label="Sign Out" danger onClick={() => { setUserSheetOpen(false); handleLogout(); }} />
          </MobileBottomSheet>
        )}

        <footer className="bg-white border-t border-slate-200 mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="col-span-1 md:col-span-2">
                <div className="flex items-center gap-2 mb-3">
                  <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-2 rounded-xl"><Globe2 className="w-4 h-4 text-white" /></div>
                  <span className="font-bold text-slate-900 text-lg">Voice to Action</span>
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs"><Lock className="w-3 h-3 mr-1" />Secure</Badge>
                </div>
                <p className="text-sm text-slate-600 max-w-sm">A secure, transparent platform for global opinion. Built with enterprise-grade security and privacy protections.</p>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 mb-3">Platform</h4>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li><Link to={createPageUrl("Home")} className="hover:text-blue-600">Discover Polls</Link></li>
                  <li><Link to={createPageUrl("Communities")} className="hover:text-blue-600">Communities</Link></li>
                  <li><Link to={createPageUrl("PublicFigures")} className="hover:text-blue-600">Impact Records</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 mb-3">Trust & Safety</h4>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li><Link to={createPageUrl("SecuritySettings")} className="hover:text-blue-600">Security</Link></li>
                  <li><Link to="/terms-of-service" className="hover:text-blue-600">Terms of Service</Link></li>
                  <li><Link to="/privacy-policy" className="hover:text-blue-600">Privacy Policy</Link></li>
                  <li><Link to={createPageUrl("LegalSettings")} className="hover:text-blue-600">Legal & Policies</Link></li>
                  <li><Link to={createPageUrl("FreeExpressionPolicy")} className="hover:text-blue-600">Free Expression Principles</Link></li>
                  <li><Link to={createPageUrl("TakedownRequest")} className="hover:text-blue-600">Submit Legal Complaint</Link></li>
                </ul>
              </div>
            </div>
            <div className="mt-8 pt-8 border-t border-slate-200 text-center text-sm text-slate-500">
              &copy; {new Date().getFullYear()} Every Voice Proprietary Limited. Voice to Action™ is a product of Every Voice Proprietary Limited. All rights reserved.
            </div>
          </div>
        </footer>
      </div>
    </ToSGate>
  );
}