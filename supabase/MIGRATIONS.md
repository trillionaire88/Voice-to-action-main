# Supabase Schema & Migrations

This document describes the database schema, how to apply it to a fresh Supabase
project, and how to add migrations going forward.

---

## Fresh Installation

To set up the database from scratch, execute the following SQL files in the
Supabase dashboard **SQL Editor** in the order listed below.

### Step 1 — Core schema

```sql
-- Run first: the complete application schema
supabase/schema.sql
```

### Step 2 — Feature-specific schemas (run in order)

```text
supabase/messages_schema.sql
supabase/messaging_schema.sql
supabase/newsfeed_schema.sql
supabase/gdpr_schema.sql
supabase/crisis_schema.sql
supabase/push_notifications_schema.sql
supabase/petition_delivery_schema.sql
supabase/global_scale_schema.sql
```

### Step 3 — Security hardening (run in order)

These files add row-level security policies and security controls in layers.
Run them **after** the feature schemas.

```text
supabase/storage_rls.sql
supabase/security_hardening_run_in_sql_editor.sql
supabase/layer2_advanced_security.sql
supabase/layer3_nation_state_security.sql
supabase/layer4_maximum_depth_security.sql
```

### Step 4 — Incremental fixes and constraints

Apply these after the security layers. They are idempotent.

```text
supabase/public_profile_view.sql
supabase/platform_stats_public_summary.sql
supabase/schema_audit_fix.sql
supabase/missing_columns_fix.sql
supabase/petition_poll_text_limits.sql
supabase/polls_image_url_constraint.sql
supabase/poll_end_time_minimum_check.sql
supabase/poll_voting_closed_guard.sql
```

### Step 5 — Triggers and aggregates

```text
supabase/petition_signature_count_trigger.sql
supabase/poll_vote_count_trigger.sql
supabase/user_reputation_aggregate_trigger.sql
supabase/figure_rating_aggregate_trigger.sql
supabase/add_follow_count_trigger.sql
supabase/community_member_count_active.sql
```

### Step 6 — Data migrations

```text
supabase/migrate_userfollow_to_follows.sql
```

---

## Version-Controlled Migrations

Going forward, **all** schema changes must be applied through
[Supabase Migrations](https://supabase.com/docs/guides/cli/local-development#database-migrations)
using files in `supabase/migrations/`.

### Creating a new migration

```bash
supabase migration new describe_your_change
# e.g. supabase migration new add_petition_export_columns
```

This creates `supabase/migrations/YYYYMMDDHHMMSS_describe_your_change.sql`.

Write your SQL inside the generated file. Make it **idempotent** where possible:

```sql
-- good
ALTER TABLE petitions ADD COLUMN IF NOT EXISTS exported_at timestamptz;

-- avoid
ALTER TABLE petitions ADD COLUMN exported_at timestamptz;  -- fails if run twice
```

### Applying migrations locally

```bash
supabase db reset       # resets the local DB and re-applies all migrations
supabase db push        # pushes local migrations to the linked remote project
```

### Applied migrations

| File | Description |
|---|---|
| `20260506120000_petition_exports.sql` | Adds `exported_at` and `export_format` columns to petitions |

---

## Legacy SQL Files

The files in the `supabase/` root (outside `migrations/`) are legacy scripts
applied manually during the initial build. They are kept for reference and
disaster-recovery purposes only. **Do not modify them.** All new changes must
go through `supabase/migrations/`.
