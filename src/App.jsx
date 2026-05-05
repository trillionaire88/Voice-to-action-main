import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import React, { Suspense, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Shield, AlertTriangle } from 'lucide-react';
import { NavigationProvider } from '@/lib/NavigationContext';
import SecurityProvider from "@/components/SecurityProvider";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ReAuthProvider } from "@/components/ReAuthModal";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import CookiePolicy from "@/pages/CookiePolicy";
import TermsOfService from "@/pages/TermsOfService";
import LandingPage from "@/pages/LandingPage";

const SecurityDashboard = React.lazy(() => import("./pages/SecurityDashboard"));
const BackupStatus = React.lazy(() => import("./pages/BackupStatus"));
const PrivacyCompliance = React.lazy(() => import("./pages/PrivacyCompliance"));
const Newsfeed = React.lazy(() => import("./pages/Newsfeed"));
const FeedSettings = React.lazy(() => import("./pages/FeedSettings"));
const SavedItems = React.lazy(() => import("./pages/SavedItems"));
const MessageSettings = React.lazy(() => import("./pages/MessageSettings"));
const FollowingFeed = React.lazy(() => import("./pages/FollowingFeed"));
const Messages = React.lazy(() => import('./pages/Messages'));
const RequestVerification = React.lazy(() => import('./pages/RequestVerification'));
const VerificationAdmin = React.lazy(() => import('./pages/VerificationAdmin'));
const Notifications = React.lazy(() => import('./pages/Notifications'));
const FollowList = React.lazy(() => import('./pages/FollowList'));
const AdminMessages = React.lazy(() => import('./pages/AdminMessages'));
const EditCommunity = React.lazy(() => import('./pages/EditCommunity'));
const CivicMap = React.lazy(() => import('./pages/CivicMap'));
const AdminSignatures = React.lazy(() => import('./pages/AdminSignatures'));
const AdminCommunities = React.lazy(() => import('./pages/AdminCommunities'));
const CommunitySubscriptionPage = React.lazy(() => import('./pages/CommunitySubscription'));
const EmbedWidget = React.lazy(() => import('./pages/EmbedWidget'));
const Onboarding = React.lazy(() => import('./pages/Onboarding'));

const prefetchCriticalPages = () => {
  const criticalPages = [
    () => import("./pages/Petitions"),
    () => import("./pages/Discovery"),
    () => import("./pages/Profile"),
    () => import("./pages/Messages"),
  ];
  setTimeout(() => {
    criticalPages.forEach((importFn) => importFn().catch(() => {}));
  }, 3000);
};

const { Pages, Layout } = pagesConfig;

// Role hierarchy — higher number = more permissions
const ROLE_HIERARCHY = {
  owner_admin: 100,
  admin: 80,
  moderator: 60,
  verified: 40,
  user: 20,
  guest: 0,
};

const hasRole = (user, requiredRole) => {
  if (!user) return false;
  return (ROLE_HIERARCHY[user.role] ?? 0) >= (ROLE_HIERARCHY[requiredRole] ?? 0);
};

// Pages that are publicly accessible without authentication
const PUBLIC_PAGE_KEYS = new Set([
  'About', 'HowItWorks', 'Purpose', 'PrivacyPolicy', 'CookiePolicy',
  'PressKit', 'TermsOfService', 'VerifyEmail', 'EmbedWidget',
  'PublicAuditLog', 'VerifySignature', 'PublicVoting',
  'FreeExpressionPolicy', 'Constitution',
]);

// Route-level auth guard
const ProtectedRoute = ({
  children,
  requiredRole = 'user',
  requireOwner = false,
  skipEmailCheck = false,
  skipOnboardingCheck = false,
}) => {
  const { user, isAuthenticated, isLoadingAuth } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    // Redirect to landing page with signin param
    window.location.assign(`${window.location.origin}/?signin=1&return=${encodeURIComponent(window.location.pathname)}`);
    return null;
  }

  // Email verification gate
  if (!skipEmailCheck && !user.email_confirmed_at && !user.is_email_verified) {
    return <Navigate to="/VerifyEmail" replace />;
  }

  // Onboarding gate
  if (!skipOnboardingCheck && user.onboarding_completed === false) {
    return <Navigate to="/Onboarding" replace />;
  }

  if (requireOwner && user?.role !== 'owner_admin') {
    return <Navigate to="/Home" replace />;
  }

  const userRole = user?.role || 'user';
  if (!hasRole({ ...user, role: userRole }, requiredRole)) {
    return <Navigate to="/Home" replace />;
  }

  return children;
};

const PageLoader = () => (
  <div className="w-full flex items-center justify-center py-20">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
  </div>
);

const LayoutWrapper = ({ children, currentPageName }) => {
  const content = Layout
    ? <Layout currentPageName={currentPageName}>{children}</Layout>
    : <>{children}</>;
  return (
    <ErrorBoundary key={currentPageName}>
      {content}
    </ErrorBoundary>
  );
};

const OWNER_PAGES = new Set(['MasterAdmin']);

const ADMIN_PAGES = new Set([
  'AdminDashboard', 'AdminAITools', 'AdminCharityReview',
  'ComplianceDashboard', 'FinanceDashboard', 'RiskMonitor',
  'DeepAnalytics', 'AuthorityDirectoryAdmin', 'AdminMessages',
  'AdminSignatures', 'VerificationAdmin',
]);

const MOD_PAGES = new Set([
  'ModeratorDashboard', 'TakedownPanel', 'VerificationQueue',
]);

const getRouteProtection = (pageKey) => {
  if (OWNER_PAGES.has(pageKey)) return { requireOwner: true, requiredRole: 'admin' };
  if (ADMIN_PAGES.has(pageKey)) return { requiredRole: 'admin' };
  if (MOD_PAGES.has(pageKey)) return { requiredRole: 'moderator' };
  return {};
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, authError } = useAuth();
  const [platformStatus, setPlatformStatus] = useState(null);
  useEffect(() => { prefetchCriticalPages(); }, []);

  useEffect(() => {
    const load = () => {
      supabase
        .from('platform_status')
        .select('panic_mode, maintenance_mode, panic_reason')
        .eq('id', 1)
        .single()
        .then(({ data }) => setPlatformStatus(data ?? { panic_mode: false, maintenance_mode: false }));
    };
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, []);

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Loading Voice to Action…</p>
        </div>
      </div>
    );
  }

  if (authError?.type === 'user_not_registered') return <UserNotRegisteredError />;

  if (platformStatus?.panic_mode) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
            <Shield className="w-10 h-10 text-red-400" />
          </div>
          <h1 className="text-3xl font-black text-white">Platform Secured</h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Voice to Action is temporarily in secure mode. All data is safe.
            We will be back shortly.
          </p>
          {platformStatus.panic_reason && (
            <p className="text-xs text-slate-600 bg-slate-800 rounded-lg px-4 py-2">
              Status: {platformStatus.panic_reason}
            </p>
          )}
          <p className="text-xs text-slate-600">Contact support: voicetoaction@outlook.com</p>
        </div>
      </div>
    );
  }

  if (platformStatus?.maintenance_mode) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-4">
          <AlertTriangle className="w-14 h-14 text-amber-500 mx-auto" />
          <h1 className="text-2xl font-bold text-slate-900">Scheduled Maintenance</h1>
          <p className="text-slate-500 text-sm">We are performing maintenance. We will be back shortly.</p>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* ─── PUBLIC ROOT ─── */}
        <Route path="/" element={<LandingPage />} />

        {/* ─── ALWAYS PUBLIC PAGES ─── */}
        <Route path="/About" element={<LayoutWrapper currentPageName="About">{Pages.About && <Pages.About />}</LayoutWrapper>} />
        <Route path="/HowItWorks" element={<LayoutWrapper currentPageName="HowItWorks">{Pages.HowItWorks && <Pages.HowItWorks />}</LayoutWrapper>} />
        <Route path="/Purpose" element={<LayoutWrapper currentPageName="Purpose">{Pages.Purpose && <Pages.Purpose />}</LayoutWrapper>} />
        <Route path="/PrivacyPolicy" element={<LayoutWrapper currentPageName="PrivacyPolicy"><PrivacyPolicy /></LayoutWrapper>} />
        <Route path="/privacy-policy" element={<LayoutWrapper currentPageName="PrivacyPolicy"><PrivacyPolicy /></LayoutWrapper>} />
        <Route path="/CookiePolicy" element={<LayoutWrapper currentPageName="CookiePolicy"><CookiePolicy /></LayoutWrapper>} />
        <Route path="/TermsOfService" element={<LayoutWrapper currentPageName="TermsOfService"><TermsOfService /></LayoutWrapper>} />
        <Route path="/terms-of-service" element={<LayoutWrapper currentPageName="TermsOfService"><TermsOfService /></LayoutWrapper>} />
        <Route path="/PressKit" element={<LayoutWrapper currentPageName="PressKit">{Pages.PressKit && <Pages.PressKit />}</LayoutWrapper>} />
        <Route path="/FreeExpressionPolicy" element={<LayoutWrapper currentPageName="FreeExpressionPolicy">{Pages.FreeExpressionPolicy && <Pages.FreeExpressionPolicy />}</LayoutWrapper>} />
        <Route path="/Constitution" element={<LayoutWrapper currentPageName="Constitution">{Pages.Constitution && <Pages.Constitution />}</LayoutWrapper>} />
        <Route path="/EmbedWidget" element={<EmbedWidget />} />
        <Route path="/VerifyEmail" element={<Pages.VerifyEmail />} />
        <Route path="/VerifySignature" element={<LayoutWrapper currentPageName="VerifySignature">{Pages.VerifySignature && <Pages.VerifySignature />}</LayoutWrapper>} />
        <Route path="/PublicVoting" element={<LayoutWrapper currentPageName="PublicVoting">{Pages.PublicVoting && <Pages.PublicVoting />}</LayoutWrapper>} />
        <Route path="/PublicAuditLog" element={<LayoutWrapper currentPageName="PublicAuditLog">{Pages.PublicAuditLog && <Pages.PublicAuditLog />}</LayoutWrapper>} />

        {/* ─── ONBOARDING (auth required, email check skipped) ─── */}
        <Route path="/Onboarding" element={
          <ProtectedRoute skipOnboardingCheck>
            <Suspense fallback={<PageLoader />}><Onboarding /></Suspense>
          </ProtectedRoute>
        } />

        {/* ─── PROTECTED PAGES from pages.config (dynamic) ─── */}
        {Object.entries(Pages).map(([pageKey, Page]) => {
          // Skip pages that are already declared as public above
          if (PUBLIC_PAGE_KEYS.has(pageKey)) return null;

          const protection = getRouteProtection(pageKey);
          const element = (
            <LayoutWrapper currentPageName={pageKey}><Page /></LayoutWrapper>
          );
          return (
            <Route
              key={pageKey}
              path={`/${pageKey}`}
              element={
                <ProtectedRoute {...protection}>
                  {element}
                </ProtectedRoute>
              }
            />
          );
        })}

        {/* ─── EXPLICITLY DECLARED PROTECTED ROUTES ─── */}
        <Route path="/Messages" element={<ProtectedRoute><LayoutWrapper currentPageName="Messages"><Messages /></LayoutWrapper></ProtectedRoute>} />
        <Route path="/RequestVerification" element={<ProtectedRoute><LayoutWrapper currentPageName="RequestVerification"><RequestVerification /></LayoutWrapper></ProtectedRoute>} />
        <Route path="/VerificationAdmin" element={<ProtectedRoute requiredRole="admin"><LayoutWrapper currentPageName="VerificationAdmin"><VerificationAdmin /></LayoutWrapper></ProtectedRoute>} />
        <Route path="/Notifications" element={<ProtectedRoute><LayoutWrapper currentPageName="Notifications"><Notifications /></LayoutWrapper></ProtectedRoute>} />
        <Route path="/FollowList" element={<ProtectedRoute><LayoutWrapper currentPageName="FollowList"><FollowList /></LayoutWrapper></ProtectedRoute>} />
        <Route path="/AdminMessages" element={<ProtectedRoute requiredRole="admin"><LayoutWrapper currentPageName="AdminMessages"><AdminMessages /></LayoutWrapper></ProtectedRoute>} />
        <Route path="/EditCommunity" element={<ProtectedRoute><LayoutWrapper currentPageName="EditCommunity"><EditCommunity /></LayoutWrapper></ProtectedRoute>} />
        <Route path="/CivicMap" element={<ProtectedRoute><LayoutWrapper currentPageName="CivicMap"><CivicMap /></LayoutWrapper></ProtectedRoute>} />
        <Route path="/AdminSignatures" element={<ProtectedRoute requiredRole="admin"><LayoutWrapper currentPageName="AdminSignatures"><AdminSignatures /></LayoutWrapper></ProtectedRoute>} />
        <Route path="/SecurityDashboard" element={<ProtectedRoute requiredRole="admin"><LayoutWrapper currentPageName="SecurityDashboard"><SecurityDashboard /></LayoutWrapper></ProtectedRoute>} />
        <Route path="/BackupStatus" element={<ProtectedRoute requiredRole="admin"><LayoutWrapper currentPageName="BackupStatus"><BackupStatus /></LayoutWrapper></ProtectedRoute>} />
        <Route path="/PrivacyCompliance" element={<ProtectedRoute><LayoutWrapper currentPageName="PrivacyCompliance"><PrivacyCompliance /></LayoutWrapper></ProtectedRoute>} />
        <Route path="/Newsfeed" element={<ProtectedRoute><LayoutWrapper currentPageName="Newsfeed"><Newsfeed /></LayoutWrapper></ProtectedRoute>} />
        <Route path="/FeedSettings" element={<ProtectedRoute><LayoutWrapper currentPageName="FeedSettings"><FeedSettings /></LayoutWrapper></ProtectedRoute>} />
        <Route path="/SavedItems" element={<ProtectedRoute><LayoutWrapper currentPageName="SavedItems"><SavedItems /></LayoutWrapper></ProtectedRoute>} />
        <Route path="/MessageSettings" element={<ProtectedRoute><LayoutWrapper currentPageName="MessageSettings"><MessageSettings /></LayoutWrapper></ProtectedRoute>} />
        <Route path="/following-feed" element={<ProtectedRoute><LayoutWrapper currentPageName="FollowingFeed"><FollowingFeed /></LayoutWrapper></ProtectedRoute>} />
        <Route path="/community-subscription" element={<ProtectedRoute><LayoutWrapper currentPageName="CommunitySubscription"><CommunitySubscriptionPage /></LayoutWrapper></ProtectedRoute>} />
        <Route path="/admin-communities" element={<ProtectedRoute requiredRole="admin"><LayoutWrapper currentPageName="AdminCommunities"><AdminCommunities /></LayoutWrapper></ProtectedRoute>} />

        {/* ─── REDIRECTS ─── */}
        <Route path="/CitizenJury" element={<Navigate to="/" replace />} />
        <Route path="/security-dashboard" element={<Navigate to="/SecurityDashboard" replace />} />
        <Route path="/Charities" element={<Navigate to="/" replace />} />
        <Route path="/CharityProfile" element={<Navigate to="/" replace />} />
        <Route path="/SubmitCharity" element={<Navigate to="/" replace />} />
        <Route path="/AdminCharityReview" element={<Navigate to="/" replace />} />
        <Route path="/MyDonations" element={<Navigate to="/" replace />} />

        <Route path="*" element={<LayoutWrapper currentPageName="404"><PageNotFound /></LayoutWrapper>} />
      </Routes>
    </Suspense>
  );
};

// Top-level error boundary
class AppErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error, info) { console.error('[AppErrorBoundary]', error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
          <div className="max-w-md w-full text-center space-y-4">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-slate-900">Something went wrong</h1>
            <p className="text-slate-500 text-sm">An unexpected error occurred. Please refresh the page.</p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  return (
    <AppErrorBoundary>
      <SecurityProvider>
        <AuthProvider>
          <ReAuthProvider>
            <QueryClientProvider client={queryClientInstance}>
              <Router>
                <NavigationProvider>
                  <AuthenticatedApp />
                </NavigationProvider>
              </Router>
              <Toaster />
            </QueryClientProvider>
          </ReAuthProvider>
        </AuthProvider>
      </SecurityProvider>
    </AppErrorBoundary>
  );
}

export default App;
