# Database setup

The project has one Supabase-hosted PostgreSQL database.

- `@supabase/supabase-js` and `@supabase/ssr` remain the clients for Supabase Data API and authentication.
- Drizzle ORM is for server-only SQL queries, schema definitions, and versioned migrations.
- PostGIS stores event locations and hazard/admin boundaries. The initial migration enables it before creating spatial columns.

The initial schema covers data sources, administrative areas, canonical disaster events, official alerts, earthquake details, weather observations, hotspots, hazard zones, and ingestion logs. Provider payloads are retained in `source_payload` JSONB columns for traceability.

## Environment setup

1. Copy `.env.example` to `.env.local` if you do not already have one. Never commit `.env.local`.
2. Keep the existing `NEXT_PUBLIC_SUPABASE_*` variables used by Supabase JS/SSR.
3. Only if a server-side Drizzle query or migration is needed, add `DATABASE_URL` using Supabase **Transaction Pooler** (port `6543`) and append `?sslmode=require`.

`DATABASE_URL` has no `NEXT_PUBLIC_` prefix, and `db/index.ts` is marked server-only, so direct database credentials cannot enter a browser bundle. The PostgreSQL driver disables prepared statements because Supabase's Transaction Pooler does not preserve a session between transactions.

## Commands

```bash
# Install dependencies (already reflected in package-lock.json)
npm install

# Generate a migration after changing db/schema.ts; review the SQL before applying it.
npm run db:generate

# Applies unapplied migrations to the DATABASE_URL target. This changes that database.
npm run db:migrate

# Optional local schema browser. It also requires DATABASE_URL.
npm run db:studio

# Verify application types and build output.
npm run lint
npm run build
```

Do not run `npm run db:migrate` against the hosted Supabase project until the generated SQL has been reviewed and a backup/export is available. The initial migration enables row-level security on every public table and intentionally creates no public access policies; add narrowly scoped policies before exposing a table through the Supabase Data API.
