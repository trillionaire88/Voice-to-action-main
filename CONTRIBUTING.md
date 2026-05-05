# Contributing to Voice to Action

Thank you for your interest in contributing! This document explains how to set up
your development environment and how we expect contributions to be structured.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Development Setup](#development-setup)
- [Branch Naming](#branch-naming)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [TypeScript Guidelines](#typescript-guidelines)
- [Database Changes](#database-changes)

---

## Code of Conduct

Be respectful, inclusive, and constructive. We are building a platform for civic
accountability, and we hold ourselves to the same standard.

---

## Development Setup

1. **Fork and clone** the repository.

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env
   # fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY at minimum
   ```

4. **Start the dev server:**
   ```bash
   npm run dev
   ```

5. **Verify everything works:**
   ```bash
   npm run lint
   npm run typecheck
   npm test
   ```

---

## Branch Naming

Use the following prefixes:

| Prefix | When to use |
|---|---|
| `feat/` | A new feature |
| `fix/` | A bug fix |
| `docs/` | Documentation only |
| `refactor/` | Code restructuring with no behaviour change |
| `test/` | Adding or improving tests |
| `chore/` | Build, config, dependency updates |
| `perf/` | Performance improvements |
| `security/` | Security fixes |

**Examples:** `feat/petition-export`, `fix/auth-redirect-loop`, `docs/mobile-setup`

---

## Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(optional scope): short imperative description

Optional longer body explaining the "why".

Optional footer: BREAKING CHANGE, Closes #issue
```

**Examples:**

```
feat(petitions): add CSV export for petition signatures
fix(auth): prevent redirect loop on expired session
docs(readme): add mobile development section
chore(deps): bump @supabase/supabase-js to 2.99.3
```

Keep the subject line under **72 characters** and written in the imperative mood
("add", "fix", "update" — not "added", "fixes", "updating").

---

## Pull Request Process

1. **Keep PRs focused** — one logical change per PR. Split large changes into
   smaller, reviewable pieces.

2. **Write tests** for new functionality and bug fixes.

3. **Ensure CI passes** before requesting review:
   - `npm run lint` — zero ESLint errors
   - `npm run typecheck` — zero TypeScript errors
   - `npm test` — all tests pass
   - `npm run build` — production build succeeds

4. **Fill in the PR description** with:
   - What changed and why
   - Screenshots for UI changes
   - Any deployment notes (migrations, env vars, feature flags)

5. **Link related issues** using `Closes #123` in the PR description.

6. **One approving review** is required before merging.

---

## Coding Standards

### General

- Write **clear, self-documenting code**. Add comments only when the *why*
  is not obvious from the *what*.
- Keep components **small and focused** — if a component exceeds ~200 lines,
  consider splitting it.
- Prefer **named exports** for components and utilities.
- Use `@/` path alias (maps to `src/`) for all internal imports.

### React

- Use **functional components** and hooks; no new class components.
- Keep business logic out of JSX — extract it into custom hooks in `src/hooks/`.
- Handle loading and error states explicitly in every async operation.
- Use `React.lazy` + `Suspense` for new top-level page components to keep
  the initial bundle small.

### Styling

- Use **Tailwind CSS** utility classes. Avoid inline styles.
- Use `cn()` from `@/lib/utils` to merge conditional class names.
- Place global overrides in `src/globals.css`, not in component styles.
- Follow the existing dark/light theme tokens.

### User Input

- **Always sanitise** user-generated content before storing or rendering.
  Use `sanitiseText` / `sanitiseUrl` from `@/lib/sanitise`.
- **Validate** form data with `zod` schemas.

---

## Testing

We use [Vitest](https://vitest.dev/) and [Testing Library](https://testing-library.com/).

### Running tests

```bash
npm test                # single run
npm run test:watch      # watch mode
npm run test:coverage   # coverage report
```

### What to test

| Code | What to cover |
|---|---|
| `src/lib/` utilities | All exported functions; edge cases and error paths |
| Custom hooks (`src/hooks/`) | Happy path, error path, and cleanup |
| Components | Render without crash; key user interactions; error boundary fallback |

### Where tests live

Tests live in `__tests__/` sub-directories next to the code they test:

```
src/
  lib/
    __tests__/
      sanitise.test.ts
  hooks/
    __tests__/
      useDebounce.test.ts
  components/
    __tests__/
      ErrorBoundary.test.jsx
```

### What not to test

- Third-party library internals (Radix UI, Supabase SDK, etc.)
- Pure Tailwind styling
- Snapshot tests (they are brittle and provide little value here)

---

## TypeScript Guidelines

- **New files** in `src/lib/` and `src/api/` must be `.ts` / `.tsx`.
- Enable strict inference — avoid `as unknown as T` casts where possible.
- Export **interfaces** for public API shapes; use `type` for unions and
  mapped types.
- The `tsconfig.json` enforces `strict: true` for all TypeScript source files.
  Run `npm run typecheck` before committing.

---

## Database Changes

All schema changes must go through Supabase migrations:

1. Create a new file in `supabase/migrations/` with the format
   `YYYYMMDDHHMMSS_description.sql`.
2. Write the migration as an **idempotent** SQL script (use
   `CREATE TABLE IF NOT EXISTS`, `DO $$ BEGIN ... END $$`, etc.).
3. Document the change in `supabase/MIGRATIONS.md`.
4. Test the migration against a local Supabase instance before opening a PR.

Do **not** add raw SQL files directly to the `supabase/` root — those are
legacy files retained for reference only.
