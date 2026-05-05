# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- Comprehensive README with setup, deployment, and project structure documentation
- `CONTRIBUTING.md` with branch naming, commit conventions, and testing guide
- `supabase/MIGRATIONS.md` documenting schema application order
- Strict `tsconfig.json` for TypeScript source files in `src/lib/` and `src/api/`
- GitHub Actions CI workflow (lint, typecheck, test, build on every push/PR)
- GitHub Actions CodeQL security analysis workflow
- Full test suite: `sanitise`, `validation`, `security`, `rateLimit`, `dbHelpers`, `messageEncryption`, `ErrorBoundary`, and all new hooks
- Custom hooks: `useDebounce`, `useLocalStorage`, `usePagination`, `useDocumentTitle`, `useAsync`
- Vitest + Testing Library test infrastructure with coverage reporting
- `VITE_SENTRY_DSN` environment variable (Sentry DSN moved out of source code)

### Security
- Removed hardcoded Sentry DSN from `src/main.jsx` — now read from `VITE_SENTRY_DSN`

---

## [1.0.0] — 2024-01-01

### Added
- Initial public release of Voice to Action
- **Petitions:** create, sign, and deliver petitions to decision-makers
- **Polls:** create and vote in public polls
- **Public Figures:** rate and review politicians, businesses, and public figures
- **Communities:** create and join cause-based communities with optional subscriptions
- **Verification:** identity verification via Stripe Identity; phone and email OTP; blue-check badge
- **Payments:** creator subscriptions, community memberships, and platform funding via Stripe
- **Messaging:** end-to-end encrypted direct messages with `AES-GCM`
- **Newsfeed:** personalised algorithmic feed with following feed option
- **Search & Discovery:** full-text search and trending content
- **Civic Map:** geographical view of civic activity
- **Moderation:** content moderation queue, takedown requests, AI-assisted review
- **GDPR Compliance:** data deletion requests, privacy compliance report, cookie policy
- **Admin Dashboard:** platform stats, finance, risk monitor, deep analytics
- **Security Layer:** XSS sanitisation, CSRF tokens, session fingerprinting, inactivity timeout, prototype locking
- **Internationalisation:** English, Spanish, French, Arabic, Portuguese, Hindi, Chinese
- **Mobile:** iOS and Android apps via Capacitor 8
- **PWA:** service worker, web app manifest, install prompt
- **Monitoring:** Sentry error tracking, backup health dashboard, security audit log
- ~50 Supabase Edge Functions (payments, email, AI, moderation, analytics, push notifications)
