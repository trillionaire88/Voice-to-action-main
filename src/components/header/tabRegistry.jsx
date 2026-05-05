import {
  PlusCircle, Users, FileText, TrendingUp, Vote, Globe2, Scale,
  Star, Trophy, Settings, Shield, DollarSign, ShieldAlert, Search,
  Database, Landmark, BookOpen, MessageSquare, Mail,
  AlertCircle, Zap, Map, Compass, Info, Target, Gift, Home, BarChart3, UserPlus, Newspaper, Bookmark
} from "lucide-react";
import { createPageUrl } from "@/utils";

export const ALL_TABS = [
  { key: "Home",               label: "Home",               icon: Home,          requiresAuth: false, adminOnly: false, modOnly: false },
  { key: "About",              label: "About",              icon: Info,          requiresAuth: false, adminOnly: false, modOnly: false },
  { key: "Purpose",            label: "Purpose",            icon: Target,        requiresAuth: false, adminOnly: false, modOnly: false },
  { key: "Discovery",          label: "Discover",           icon: Compass,       requiresAuth: false, adminOnly: false, modOnly: false },
  { key: "Newsfeed",           label: "Newsfeed",           icon: Newspaper,     requiresAuth: true,  adminOnly: false, modOnly: false },
  { key: "Search",             label: "Search",             icon: Search,        requiresAuth: false, adminOnly: false, modOnly: false },
  { key: "PolicyDiscussions",  label: "Discussions",        icon: MessageSquare, requiresAuth: false, adminOnly: false, modOnly: false },
  { key: "CreatePoll",         label: "Create Poll",        icon: PlusCircle,    requiresAuth: true,  adminOnly: false, modOnly: false },
  { key: "Communities",        label: "Communities",        icon: Users,         requiresAuth: true,  adminOnly: false, modOnly: false },
  { key: "Petitions",          label: "Petitions",          icon: FileText,      requiresAuth: true,  adminOnly: false, modOnly: false },
  { key: "Polls",              label: "Polls",              icon: BarChart3,     path: "/Discovery?tab=polls", requiresAuth: false, adminOnly: false, modOnly: false },
  { key: "FollowingFeed",      label: "Following",          icon: UserPlus,      path: "/following-feed", requiresAuth: true, adminOnly: false, modOnly: false },
  { key: "Messages",           label: "Messages",           icon: Mail,          path: "/Messages", requiresAuth: true, adminOnly: false, modOnly: false },
  { key: "CongressDashboard",  label: "Congress Portal",    icon: Scale,         requiresAuth: true,  adminOnly: false, modOnly: false },
  { key: "TrendingPetitions",  label: "Trending",           icon: TrendingUp,    requiresAuth: true,  adminOnly: false, modOnly: false },
  { key: "CurrentIssues",      label: "Current Issues",     icon: AlertCircle,   requiresAuth: true,  adminOnly: false, modOnly: false },
  { key: "PublicVoting",       label: "Public Voting",      icon: Vote,          requiresAuth: true,  adminOnly: false, modOnly: false },
  { key: "GlobalOpinion",      label: "Global Opinion",     icon: Globe2,        requiresAuth: true,  adminOnly: false, modOnly: false },
  { key: "RealityIndex",       label: "Reality Index",      icon: Scale,         requiresAuth: true,  adminOnly: false, modOnly: false },
  { key: "Governance",         label: "Governance",         icon: Landmark,      requiresAuth: true,  adminOnly: false, modOnly: false },
  { key: "Scorecards",         label: "Scorecards",         icon: Star,          requiresAuth: true,  adminOnly: false, modOnly: false },
  { key: "InfluenceIndex",     label: "Influence Index",    icon: Trophy,        requiresAuth: true,  adminOnly: false, modOnly: false },
  { key: "PublicFigures",      label: "Impact Records",     icon: Scale,         requiresAuth: true,  adminOnly: false, modOnly: false },
  { key: "WorldView",          label: "World View",         icon: Map,           requiresAuth: true,  adminOnly: false, modOnly: false },
  { key: "DecisionTracking",   label: "Decisions",          icon: BookOpen,      requiresAuth: true,  adminOnly: false, modOnly: false },
  { key: "PlatformFunding",    label: "Support Us",         icon: DollarSign,    requiresAuth: false, adminOnly: false, modOnly: false },
  { key: "CreatorReferral",    label: "Creator Referral",   icon: Gift,          requiresAuth: true,  adminOnly: false, modOnly: false },
  { key: "ModeratorDashboard", label: "Moderation",         icon: Shield,        requiresAuth: true,  adminOnly: false, modOnly: true  },
  { key: "AdminDashboard",     label: "Admin",              icon: Settings,      requiresAuth: true,  adminOnly: true,  modOnly: false },
  { key: "ComplianceDashboard",label: "Compliance",         icon: FileText,      requiresAuth: true,  adminOnly: true,  modOnly: false },
  { key: "FinanceDashboard",   label: "Finance",            icon: DollarSign,    requiresAuth: true,  adminOnly: true,  modOnly: false },
  { key: "RiskMonitor",        label: "Risk Monitor",       icon: ShieldAlert,   requiresAuth: true,  adminOnly: true,  modOnly: false },
  { key: "DeepAnalytics",      label: "Deep Analytics",     icon: Database,      requiresAuth: true,  adminOnly: true,  modOnly: false },
  { key: "AdminAITools",       label: "AI Tools",           icon: Zap,           requiresAuth: true,  adminOnly: true,  modOnly: false },
  { key: "MasterAdmin",        label: "Master Control",     icon: Shield,        requiresAuth: true,  adminOnly: true,  modOnly: false },
  { key: "SecurityDashboard",  label: "Security Dashboard", icon: Shield,        requiresAuth: true,  adminOnly: true,  modOnly: false },
  { key: "BackupStatus",       label: "Backup Status",      icon: ShieldAlert,   requiresAuth: true,  adminOnly: true,  modOnly: false },
  { key: "PrivacyCompliance",  label: "Privacy Compliance", icon: FileText,      requiresAuth: true,  adminOnly: true,  modOnly: false },
  { key: "FeedSettings",       label: "Feed Settings",      icon: Settings,      requiresAuth: true,  adminOnly: false, modOnly: false },
  { key: "SavedItems",         label: "Saved Items",        icon: Bookmark,      requiresAuth: true,  adminOnly: false, modOnly: false },
  { key: "MessageSettings",    label: "Message Settings",   icon: MessageSquare, requiresAuth: true,  adminOnly: false, modOnly: false },
];

export const REQUIRED_TABS = ["Home", "Search"];

export const DEFAULT_TABS = [
  "Home", "Newsfeed", "Search", "About", "Purpose", "Discovery", "Petitions", "Polls", "FollowingFeed", "Messages", "Communities", "PlatformFunding",
];

export const CREATOR_REFERRAL_ROLES = [
  "owner_admin", "admin", "verified", "political_figure", "news_outlet", "community_owner",
];

// Legacy exports for backward compatibility — order follows DEFAULT_TABS
export const HEADER_TABS = DEFAULT_TABS.map((key) => ALL_TABS.find((t) => t.key === key)).filter(Boolean);
export const MORE_DROPDOWN_TABS = ALL_TABS.filter(
  (t) => !DEFAULT_TABS.includes(t.key) && !REQUIRED_TABS.includes(t.key),
);

export function getTabHref(tab) {
  return tab.path ?? createPageUrl(tab.key);
}

export function isTabLocationActive(tab, location) {
  if (tab.path) {
    return `${location.pathname}${location.search}` === tab.path;
  }
  return location.pathname === createPageUrl(tab.key);
}