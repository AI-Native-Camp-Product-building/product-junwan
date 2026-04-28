# AGENTS.md

This file is the working guide for coding agents in this repository. Keep it synchronized with the actual codebase; do not treat older specs as source of truth when code and docs disagree.

## Project Overview

**AmInsight** is an internal marketing performance dashboard for brand planners. It syncs global advertising RAW data from 8 Google Sheets into Supabase, normalizes campaign dimensions, and exposes the data through a GUI for tracking performance, exploring ad results, exporting tables, and generating AI-assisted query insights.

Core business users need fast answers to questions like:

- How are ROAS, spend, signups, and revenue trending by country, medium, goal, and creative?
- Which works or campaigns are overperforming or underperforming?
- Can non-engineers slice RAW marketing data without writing SQL?

## Commands

```bash
npm run dev            # Next dev server on http://localhost:1004
npm run build          # Production build
npm run start          # Start built Next app
npm run lint           # ESLint
npm run typecheck      # TypeScript type check
npm run test           # Vitest
npm run test:coverage  # Vitest coverage
```

Notes:

- Vitest is configured, but coverage is still narrow. Current tests live mainly around format/query-table helpers.
- The app uses Next.js App Router and React Server/Client Component boundaries. Keep server-only modules out of client components.
- The project uses PowerShell in this workspace. Prefer `rg`/`rg --files` for searching.

## Tech Stack

| Area        | Choice                                | Notes                                        |
| ----------- | ------------------------------------- | -------------------------------------------- |
| Framework   | Next.js 16.2.2 App Router             | Turbopack dev server                         |
| Runtime UI  | React 19.2.4                          | Client components are explicitly marked      |
| Auth        | NextAuth v4 + Google OAuth            | `@lezhin.com` domain restriction             |
| UI          | shadcn/ui style components on Base UI | `@base-ui/react`, not Radix                  |
| Styling     | Tailwind CSS v4                       | Theme tokens in `src/app/globals.css`        |
| Charts      | Recharts 3.8                          | Used through shadcn chart wrappers           |
| Tables      | `@tanstack/react-table` 8             | Sorting/filtering tables                     |
| DB          | Supabase PostgreSQL                   | anon read client + service role admin client |
| Data Source | Google Sheets API v4                  | Service Account JWT auth                     |
| AI          | Gemini via `@google/generative-ai`    | Natural language to query JSON               |
| Tests       | Vitest 4 + jsdom                      | Partial coverage                             |
| Font        | Pretendard Variable                   | CDN link in `layout.tsx`                     |
| Language    | TypeScript strict                     | Keep shared query types canonical            |

## Current System Shape

AmInsight currently has two data access paths:

1. **Overview/dashboard path**
   - `/api/dashboard` reads rows from `ad_normalized`.
   - `src/lib/dashboard-queries.ts` paginates Supabase results in 1,000-row chunks to bypass the default response cap.
   - Frontend dashboard components still perform meaningful client-side aggregation over the returned rows.
   - This path powers `/dashboard`, `/dashboard/platform`, and `/dashboard/medium`.

2. **Explore/query-engine path**
   - `/api/query` accepts a `QueryDefinition`.
   - `src/lib/query-engine.ts` validates dimensions/metrics and calls the Supabase `dynamic_aggregate` RPC.
   - Aggregation happens in PostgreSQL and only grouped results are returned to the browser.
   - This path powers `/dashboard/explore` and is the preferred architecture for new analytical views.

This split is important: Overview is stable and usable, but Explore is the more scalable model.

## Data Flow

```text
Google Sheets (8 sheets)
  -> sheets-client.ts       # Google Sheets API read
  -> sheets-parser.ts       # header mapping + row normalization
  -> sheets-sync.ts         # sheet-by-sheet sync, delete stale rows then batch upsert
  -> Supabase ad_raw
  -> ad_normalized view     # mapping joins + normalized reporting columns
  -> two query paths:
       A. dashboard-queries.ts -> /api/dashboard -> overview-style pages
       B. query-engine.ts -> dynamic_aggregate RPC -> /api/query -> Explore
  -> React dashboard/explore components
```

## Supabase Model

Main tables:

- `sheet_source` - metadata for the 8 source sheets.
- `ad_raw` - imported row-level source data. Sync currently deletes existing rows for a sheet before inserting/upserting the fresh parse result so deleted sheet rows do not remain in DB.
- `medium_map`, `goal_map`, `creative_type_map` - dimension normalization lookup tables.
- `sheet_sync_log` - sync execution history.
- `saved_queries` - saved Explore query presets.
- `user_feedback`, `user_feedback_images` - in-app feedback collection.

Main views/functions:

- `ad_normalized` - the primary reporting interface for dashboard/query code.
- `sheet_sync_latest` - latest sync state per sheet.
- `dynamic_aggregate` - server-side dynamic GROUP BY/SUM/derived metric RPC used by Explore.
- Legacy/report RPCs may still exist in `supabase/queries.sql` and `src/lib/query-views.ts`.

RLS intent:

- Public/anon read is used for reporting data.
- Service role writes are restricted to server-only code.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to client components or public APIs.

## Source Sheets

The configured sheets are in `credentials/sheets.json`:

- 레진KR
- 봄툰KR
- US
- DE
- FR
- TH
- TW
- ES

Service account:

- `pat-n8n@gen-lang-client-0537880120.iam.gserviceaccount.com`
- Each sheet must be shared with this account as a viewer.

Known sheet variations:

- KR/DE/TH/TW/ES usually use 16 columns: local ad spend + KRW.
- US has USD/KRW spend and USD/KRW revenue variants.
- FR has local/KRW spend and local/KRW revenue variants.
- DE uses euro local spend plus KRW.
- 봄툰 KR has a known ad spend KRW/local-column inconsistency; query code falls back to local spend where required.

## Key Directories

```text
src/app/                         # App Router pages and API routes
src/app/dashboard/               # Authenticated dashboard routes
src/app/api/                     # Next route handlers
src/components/dashboard/        # Overview/platform/medium dashboard UI
src/components/explore/          # Query builder, AI query, compare, chart/table UI
src/components/feedback/         # Feedback admin/form/upload UI
src/components/ui/               # shadcn/base-ui components
src/config/                      # Query schema, metrics, countries, content
src/hooks/                       # Query builder and UI hooks
src/lib/                         # Data, sync, query engine, auth, format, AI helpers
src/types/                       # Dashboard/sync/query/feedback types
supabase/                        # Schema, SQL functions, migrations
scripts/                         # DB/init/deploy/sync helper scripts
docs/                            # Product specs, plans, system diagrams, progress notes
example/                         # shadcn generated/example reference app; do not treat as production app
```

## API Routes

| Route                     | Method          | Purpose                                                         | Auth/Notes                                                                   |
| ------------------------- | --------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `/api/dashboard`          | GET             | Filtered raw-ish dashboard rows + metadata                      | Public read, in-memory cache + CDN headers                                   |
| `/api/filters`            | GET             | Filter options for country/month/medium/goal/creative           | Public read                                                                  |
| `/api/query`              | POST            | Execute `QueryDefinition` through `dynamic_aggregate`           | Server-side service role                                                     |
| `/api/ai-query`           | POST            | Convert natural language to `QueryDefinition` via Gemini        | Requires `GEMINI_API_KEY`                                                    |
| `/api/ask`                | POST            | Natural language -> query -> execution, external-style endpoint | Disabled unless `ASK_API_ENABLED=true`; optional `ASK_API_KEY`; rate-limited |
| `/api/export`             | GET             | Export dashboard/query data                                     | Check route before changing export behavior                                  |
| `/api/sync`               | POST            | Google Sheets -> Supabase sync                                  | Bearer `SYNC_API_SECRET`                                                     |
| `/api/sync-trigger`       | POST            | Frontend/server proxy for sync trigger                          | Calls sync route/server logic                                                |
| `/api/sync-status`        | GET             | Latest sync status                                              | Public read                                                                  |
| `/api/sidebar-data`       | GET             | Sidebar summary data                                            | Public read                                                                  |
| `/api/saved-queries`      | GET/POST/DELETE | Explore saved query presets                                     | Write/delete require NextAuth session                                        |
| `/api/feedback`           | GET/POST/DELETE | Feedback list/create/delete                                     | NextAuth session required                                                    |
| `/api/feedback/upload`    | POST            | Feedback image upload                                           | NextAuth session required                                                    |
| `/api/auth/[...nextauth]` | GET/POST        | Google OAuth via NextAuth                                       | `@lezhin.com` only                                                           |

## Key Modules

| Module                         | Role                                                                                   |
| ------------------------------ | -------------------------------------------------------------------------------------- |
| `src/lib/sheets-client.ts`     | Google Sheets API client. Server only.                                                 |
| `src/lib/sheets-parser.ts`     | Header matching and row parsing for sheet variants.                                    |
| `src/lib/sheets-sync.ts`       | Sync orchestrator, per-sheet error isolation, sync logs, batch write.                  |
| `src/lib/dashboard-queries.ts` | Overview data loader from `ad_normalized`; paginated row fetch + frontend row mapping. |
| `src/lib/query-engine.ts`      | Server-only Explore execution engine using Supabase RPC.                               |
| `src/lib/gemini-query.ts`      | Gemini output normalization into `QueryDefinition`.                                    |
| `src/config/query-schema.ts`   | Canonical dimensions/metrics and SQL expressions for Explore.                          |
| `src/types/query.ts`           | Canonical query builder types. Keep this aligned with `query-schema.ts` and RPC SQL.   |
| `src/lib/auth.ts`              | NextAuth Google provider and domain restriction.                                       |
| `src/middleware.ts`            | Protects `/dashboard/*` and redirects logged-in users away from `/login`.              |
| `src/lib/format.ts`            | Shared number/KRW/percent formatters.                                                  |
| `src/lib/supabase.ts`          | Public anon Supabase client.                                                           |
| `src/lib/supabase-admin.ts`    | Server-only service role client.                                                       |

## Page Structure

```text
/login                 # Google login, @lezhin.com only
/dashboard             # Overview: KPI, trends, charts, data table
/dashboard/explore     # Query builder, AI query mode, compare mode, chart/table, saved queries
/dashboard/platform    # Platform/country-oriented performance view; likely to merge into Explore later
/dashboard/medium      # Medium-oriented performance view; likely to merge into Explore later
/dashboard/analysis    # Legacy/future report area
/dashboard/feedback    # Feedback collection/admin area
```

## QueryDefinition Contract

Explore revolves around `QueryDefinition`:

- Dimensions: `country`, `month`, `date`, `week`, `medium`, `goal`, `creative_type`, `creative_name`
- Metrics: `ad_spend_krw`, `revenue_krw`, `impressions`, `clicks`, `signups`, `conversions`, `roas`, `ctr`, `signup_cpa`
- Filters support equality, inclusion, range, comparison, and `like`.
- Compare mode supports period comparison and item comparison.

When adding a new dimension or metric, update all relevant layers together:

1. `src/types/query.ts`
2. `src/config/query-schema.ts`
3. `supabase/queries.sql` and deployed `dynamic_aggregate`
4. Explore UI labels/selectors
5. Tests or at least a manual API check against `/api/query`

## UI and Styling Rules

Follow the local shadcn/base-ui style:

- Do not use `space-y-*` or `space-x-*`; use `flex gap-*` or `grid gap-*`.
- Avoid raw utility colors like `bg-blue-500`; use semantic tokens such as `bg-primary`, `text-muted-foreground`, `border-border`.
- Do not add manual `dark:` overrides unless the existing component already uses that pattern for a specific reason.
- Use chart colors through CSS variables: `hsl(var(--chart-1))` through `hsl(var(--chart-5))`.
- Use full Card composition: `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`.
- Chart cards should follow `Card > CardHeader > CardContent > ChartContainer`.
- Do not use `Button asChild`; use `buttonVariants()` for link-like buttons because this project uses Base UI compatibility rules.
- Use existing components in `src/components/ui` before adding new primitives.
- Keep operational dashboard screens dense and scannable. Avoid landing-page styling inside the authenticated app.

## Authentication and Secrets

Required public/server env vars:

```bash
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
SYNC_API_SECRET
GOOGLE_SERVICE_ACCOUNT_PATH      # optional; defaults to credentials/service-account.json
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
NEXTAUTH_SECRET
NEXTAUTH_URL
GEMINI_API_KEY                   # required for AI query routes
ASK_API_ENABLED                  # "true" to enable /api/ask
ASK_API_KEY                      # optional bearer key for /api/ask
```

Rules:

- Do not commit real secrets.
- Keep service role, Google credentials, and Gemini keys server-side only.
- Avoid importing `supabase-admin.ts`, `sheets-*`, `query-engine.ts`, or AI server helpers into client components.

## Current Assessment (2026-04-28)

Strengths:

- The project has a clear ingestion pipeline from Sheets to normalized reporting views.
- Explore introduces the right long-term architecture: typed query JSON, server validation, PostgreSQL aggregation, and compact result payloads.
- Google SSO and dashboard middleware are already in place.
- Supabase pagination fixed the old 1,000-row dashboard cap for the Overview path.
- Product docs are unusually rich and useful for understanding intent.

Structural risks:

- There are two analytical architectures in parallel: Overview still sends row-level data and aggregates on the client, while Explore aggregates on the server. New analytical work should prefer the Explore/query-engine path.
- Query metrics are defined in both TypeScript metadata and SQL RPC logic. Drift between `query-schema.ts` and `dynamic_aggregate` is the main correctness risk.
- `/api/ai-query` and `/api/ask` depend on Gemini output normalization. Treat AI-generated queries as untrusted and validate through `query-engine.ts`.
- Some routes/components are transitional or legacy (`analysis`, platform/medium standalone views, `query-views.ts`). Check before extending them.
- Vitest exists, but test coverage does not yet match the importance of sync parsing, query execution, and date/compare behavior.
- The worktree may contain unrelated user edits. Never revert changes you did not make.

Recommended direction:

- Move Overview KPI/chart aggregation toward the `dynamic_aggregate`/query-engine model.
- Consolidate platform and medium pages into reusable Explore presets or saved reports.
- Add regression tests around `sheets-parser.ts`, `query-engine.ts` validation, Gemini normalization, and compare calculations.
- Keep docs updated when changing route contracts, query dimensions/metrics, or Supabase SQL.

## Current Product Status

Completed or present:

- Landing page and authenticated dashboard shell.
- Google Workspace SSO with `@lezhin.com` restriction.
- Sheets-to-Supabase sync pipeline for 8 locales.
- Normalized reporting view and dashboard filtering.
- Overview KPI cards, ROAS/trend charts, medium/country/creative tables.
- Sync status UI.
- Explore page with manual query builder, AI query generation, compare mode, charts, result table, CSV/export path, and saved query support.
- Feedback collection/admin components and API routes.
- Partial Vitest setup.

Next likely milestones:

- Replace Overview client aggregation with server-side query aggregation.
- Turn common Explore configurations into report presets.
- Retire or merge standalone platform/medium/analysis pages after parity is confirmed.
- Expand test coverage on parser, sync, query, compare, and export behavior.
- Tighten API route auth/caching policy as data sensitivity requirements become clearer.

## Working Guidelines for Agents

- Read the relevant code before editing; this repository has moved faster than some older docs.
- Prefer existing architecture and naming. Do not introduce a second query abstraction.
- For analytics changes, start from `src/types/query.ts`, `src/config/query-schema.ts`, `src/lib/query-engine.ts`, and Supabase SQL.
- For Overview changes, inspect both data loading (`dashboard-queries.ts`) and component-side aggregation.
- For sync changes, inspect all sheet variants before assuming a column order.
- Keep edits scoped. Do not clean up unrelated dirty files.
- Run at least `npm run lint` and `npm run typecheck` for code changes when practical. Run targeted `npm run test` when touching tested helpers.
- If modifying Supabase SQL, document whether the SQL was only edited locally or actually deployed.
- When updating UI, verify responsive layout and avoid text overflow in compact dashboard panels.
