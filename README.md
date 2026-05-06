# Voice to Action

[![CI](https://github.com/trillionaire88/Voice-to-action-main/actions/workflows/ci.yml/badge.svg)](https://github.com/trillionaire88/Voice-to-action-main/actions/workflows/ci.yml)
[![CodeQL](https://github.com/trillionaire88/Voice-to-action-main/actions/workflows/codeql.yml/badge.svg)](https://github.com/trillionaire88/Voice-to-action-main/actions/workflows/codeql.yml)

> The world's civic accountability platform — sign petitions, vote in polls, hold politicians and corporations accountable, and connect with communities that share your values.

**Live app:** [voicetoaction.com](https://voicetoaction.com)

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Running Tests](#running-tests)
- [Mobile Development](#mobile-development)
- [Deployment](#deployment)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

---

## Features

| Category | Feature |
|---|---|
| **Civic Action** | Create and sign petitions · vote in polls · deliver petitions to decision-makers |
| **Accountability** | Rate politicians, corporations, and public figures · track voting records and pledges |
| **Communities** | Join or create cause-based communities · private groups · community subscriptions |
| **Verification** | Identity verification via Stripe · phone & email OTP · blue-check badge |
| **Payments** | Creator subscriptions · community memberships · Stripe Identity (Powered by Stripe) |
| **Safety** | Content moderation · AI-assisted takedown requests · GDPR data-deletion flow |
| **Analytics** | Real-time trending · global civic heatmap · deep analytics for organisers |
| **Messaging** | End-to-end encrypted direct messages |
| **Internationalisation** | English · Spanish · French · Arabic · Portuguese · Hindi · Chinese |
| **Mobile** | iOS and Android apps via Capacitor · PWA support |
| **Monitoring** | Sentry error tracking · backup health dashboard · security audit log |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite 6, TypeScript, Tailwind CSS v3, Radix UI, Framer Motion |
| **State / Data** | TanStack Query v5, React Router v6, React Hook Form + Zod |
| **Backend** | Supabase (Postgres, Auth, Realtime, Storage, Edge Functions) |
| **Payments** | Stripe Checkout, Stripe Identity |
| **Mobile** | Capacitor 8 (iOS + Android) |
| **Testing** | Vitest, Testing Library |
| **Monitoring** | Sentry |
| **i18n** | i18next + react-i18next |

---

## Prerequisites

| Tool | Minimum version |
|---|---|
| Node.js | 20 LTS |
| npm | 10 |
| Git | 2.x |
| Supabase account | — |
| (optional) Xcode | 15+ for iOS builds |
| (optional) Android Studio | latest for Android builds |

---

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/trillionaire88/Voice-to-action-main.git
cd Voice-to-action-main
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in at minimum:

```dotenv
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

See [Environment Variables](#environment-variables) for all options.

### 3. Apply the database schema

In your Supabase dashboard **SQL Editor**, run the files in `supabase/` in the order documented in [`supabase/MIGRATIONS.md`](supabase/MIGRATIONS.md).

### 4. Start the development server

```bash
npm run dev
```

The app is available at **http://localhost:5173**.

---

## Environment Variables

All variables are prefixed with `VITE_` so Vite exposes them to the browser bundle. Variables without the prefix are for Supabase Edge Functions only (set them in the Supabase dashboard).

### Required

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous / public key |

### Optional — Frontend

| Variable | Default | Description |
|---|---|---|
| `VITE_APP_URL` | `https://voicetoaction.com` | Canonical site URL (no trailing slash) |
| `VITE_APP_ID` | `io.voicetoaction.app` | App bundle ID for deep links |
| `VITE_SENTRY_DSN` | *(none)* | Sentry DSN for error monitoring |
| `VITE_ANTHROPIC_ENABLED` | `false` | Enable AI petition assistant |
| `VITE_STRIPE_CHECKOUT_FUNCTION` | `stripe-checkout` | Name of the Stripe checkout Edge Function |
| `VITE_OWNER_PANIC_EMAIL` | *(none)* | Email allowed to trigger Panic Mode |
| `VITE_SUPPORT_EMAIL` | *(none)* | Support email shown in the UI |

### Edge Functions (set in Supabase Dashboard)

| Variable | Description |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret (main) |
| `STRIPE_WEBHOOK_SECRET_BLUE` | Stripe webhook signing secret (blue-check flow) |
| `RESEND_API_KEY` | Resend API key for transactional email |
| `OWNER_PANIC_EMAIL` | Email allowed to trigger Panic Mode (server-side check) |
| `OWNER_NOTIFY_EMAIL` | Email for delivery/report alerts |
| `APP_ORIGIN` | Canonical origin (e.g. `https://voicetoaction.com`) |
| `EMAIL_FROM_NOREPLY` | From address for system emails |
| `CRON_SECRET` | Secret header value for scheduled maintenance jobs |
| `APPLICATION_ID` | Internal application identifier |

---

## Available Scripts

```bash
npm run dev             # Start Vite development server
npm run build           # Production build
npm run build:dev       # Development build (sourcemaps enabled)
npm run preview         # Preview the production build locally
npm run lint            # ESLint
npm run lint:fix        # ESLint with auto-fix
npm run typecheck       # TypeScript type-checking (TS + JS)
npm test                # Run all tests once
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Run tests with coverage report
npm run verify:headers  # Verify security headers
npm run build:mobile    # Build and sync to both iOS + Android
npm run build:ios       # Build and sync to iOS only
npm run build:android   # Build and sync to Android only
npm run cap:open:ios    # Open the iOS project in Xcode
npm run cap:open:android # Open the Android project in Android Studio
```

---

## Running Tests

```bash
# Run all tests
npm test

# Watch mode (re-runs on file save)
npm run test:watch

# Coverage report (outputs to ./coverage/)
npm run test:coverage
```

Tests live alongside the code they test in `__tests__/` sub-directories.

---

## Mobile Development

Voice to Action uses [Capacitor](https://capacitorjs.com/) for iOS and Android builds.

### iOS

```bash
npm run build:ios          # Build web assets and sync to iOS
npm run cap:open:ios       # Open in Xcode
```

Requires Xcode 15+ on macOS.

### Android

```bash
npm run build:android      # Build web assets and sync to Android
npm run cap:open:android   # Open in Android Studio
```

### Push Notifications

Configure Firebase (Android) and APNs (iOS) credentials in the Supabase dashboard. The `@capacitor/push-notifications` plugin handles registration; the `send-push-notification` Edge Function delivers messages.

---

## Deployment

### Web

```bash
npm run build        # Creates ./dist/
```

Deploy `./dist/` to any static host (Cloudflare Pages, Vercel, Netlify, etc.). Set the environment variables in your hosting provider's dashboard.

**Security headers** — See `public/cloudflare-waf-rules.md` for the recommended Content Security Policy, HSTS, and WAF rules when deploying behind Cloudflare.

Verify headers after deploying:

```bash
npm run verify:headers
```

### Supabase Edge Functions

```bash
supabase functions deploy <function-name>
```

Deploy all functions at once:

```bash
supabase functions deploy
```

---

## Project Structure

```
├── .github/
│   └── workflows/          # CI/CD pipelines (ci.yml, codeql.yml)
├── android/                # Capacitor Android project
├── ios/                    # Capacitor iOS project
├── public/                 # Static assets (PWA manifest, icons, sw.js)
├── scripts/                # Build/verification helpers
├── src/
│   ├── api/                # Supabase + Edge Function API clients
│   ├── components/         # Shared UI components (domain-grouped)
│   │   └── ui/             # shadcn/ui base components
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Framework-agnostic utilities (typed TypeScript)
│   ├── locales/            # i18n translation files (7 languages)
│   ├── pages/              # Route-level page components (~100 pages)
│   └── test/               # Global test setup
├── supabase/
│   ├── functions/          # Deno Edge Functions (~50 functions)
│   ├── migrations/         # Version-controlled DB migrations
│   └── MIGRATIONS.md       # Schema application guide
├── .env.example            # Environment variable template
├── capacitor.config.ts     # Capacitor mobile configuration
├── tailwind.config.js      # Tailwind CSS configuration
├── tsconfig.json           # TypeScript config (strict, .ts/.tsx files)
├── jsconfig.json           # JS type-checking config (.js/.jsx files)
└── vite.config.js          # Vite bundler configuration
```

---

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

**Quick start:**

1. Fork the repo and create a feature branch (`feat/your-feature`)
2. Write code and tests
3. Ensure `npm run lint`, `npm run typecheck`, and `npm test` all pass
4. Open a pull request against `main`

---

## License

© 2024 Voice to Action. All rights reserved.
