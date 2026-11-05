# Concord Work Dashboard

A read-only web dashboard for [Concord MCP](https://github.com/get-concord-ai/concord-mcp). It reads the local `.concord/concord.db` SQLite workspace and visualizes multi-agent collaboration state: who is registered, what each agent has claimed, where claims overlap, and what happened recently.

Built to explore how Concord's agent-coordination layer behaves in practice, and to give it a web interface that remote teammates can open in a browser, something the built-in `concord dashboard` terminal UI doesn't provide.

## Why this exists

Concord coordinates multiple AI coding agents (Claude Code, Codex, Cursor, Kilo Code, and others) working in the same repository. It tracks agent presence, task ownership, claimed file scopes, and overlaps, all stored locally in `.concord/concord.db`. The official interface is a terminal UI.

That works well for a single engineer at their laptop. It is less useful when you want to:

- Show a teammate or reviewer which agents are currently active
- Spot at a glance that two agents have claimed the same file
- See recent activity across the workspace without running a TUI
- Reference the collaboration state in a bug report or review

This dashboard is a small, read-only web layer over the same database. It does not replace Concord or reimplement its logic. It consumes the state Concord already writes.

## What it shows

| Panel               | Question it answers                                               | Source                               |
| ------------------- | ----------------------------------------------------------------- | ------------------------------------ |
| **Overlap alerts**  | Which agents have claimed the same file?                          | Computed from `tasks.expected_files` |
| **Agent roster**    | Who is registered, what kind of agent, and are they still active? | `agents` table                       |
| **Active tasks**    | What is currently claimed, by whom, at what version?              | `tasks` table                        |
| **Recent activity** | What did Concord do recently, and did anything flag an overlap?   | `events` table                       |

### Design decisions

**Overlaps are recomputed, not read.** The overlap panel intersects the parsed `expected_files` JSON arrays across active tasks. It does not read a precomputed overlap record, because Concord's `events` table logs overlaps as free text (for example, "1 overlap(s)") rather than structured data. Recomputing is simpler and more trustworthy than parsing that field.

**The "stale" badge is a heuristic.** It is displayed when `now - last_seen > 60s`. Concord stores only `status = 'active'`, so the dashboard surfaces a _likely_ stale agent rather than asserting it. This is called out in the UI so nobody mistakes it for ground truth.

## How the data gets there

1. `concord setup` initializes a `.concord/` workspace inside the test repo.
2. Kilo Code was manually registered as a Concord MCP client through `.kilocode/mcp.json`. Concord's built-in auto-configuration covers Claude Code, Codex, Cursor, Gemini, and Grok, but not Kilo Code, so the server entry was added by hand.
3. Kilo Code called `start_work` to claim `src/api/users.ts` as `kilo-1`.
4. A second agent (Cursor) called `start_work` to claim the same file as `cursor-1`.
5. Concord flagged the overlap. Both tasks, both agents, and the overlap event landed in `concord.db`.
6. The dashboard reads that database directly. Nothing in this project writes to it.

## Tech stack

- **Next.js 16** (App Router, Server Components): the page reads SQLite on each request, so no API layer is needed.
- **better-sqlite3**: synchronous SQLite reads, with the database opened in `readonly: true, fileMustExist: true` mode.
- **Tailwind CSS**: layout and styling.
- **TypeScript**: typed row shapes matching the actual schema.

### Key implementation details

- **Read-only by design.** `getDb()` opens the file with `readonly: true`, so the dashboard can never corrupt Concord's source of truth.
- **`fileMustExist: true`.** A typo in the path fails loudly at query time instead of silently producing an empty in-memory database, which is the most common reason a better-sqlite3 project renders blank.
- **Real schema, not guessed schema.** Column names (`tasks.agent_id`, `tasks.expected_files` as JSON text, `events.detail`) were confirmed by inspecting the live database with `PRAGMA table_info(...)`, not assumed from documentation.
- **No caching.** Next.js 16's `cacheComponents` mode renders the page dynamically by default, so the database is re-read on every request.

## Schema reference

The tables the dashboard reads, as they exist in Concord's current release:

**`agents`**

`agent_id` (PK), `kind`, `status`, `summary`, `first_seen`, `last_seen`

**`tasks`**

`task_id` (PK), `title`, `agent_id` (owner), `assigned_agent_id` (separate lease field, NULL in practice), `expected_files` (JSON array stored as TEXT), `version`, `status`, `created_at`, `updated_at`

**`events`**

`id`, `task_id`, `tool`, `status`, `detail`, `created_at`

Tables that exist but are not yet surfaced: `task_updates`, `task_ownership_events` (empty in this workspace), `handoffs`, `reviews`, `agent_messages`, `agent_message_events`, `agent_endpoints`.

## Running it

From the directory containing `concord-demo/`:

```bash
cd concord-demo/concord-work-dashboard
npm install
npm run dev
```

The app expects the Concord database at `../.concord/concord.db` relative to the Next.js project root. Override the location with:

```bash
CONCORD_DB_PATH=/absolute/path/to/concord.db npm run dev
```

Verify the data layer independently:

```bash
npx tsx scripts/check-db.ts
```

Expected output:

```
DB_PATH = /path/to/concord-demo/.concord/concord.db
agents: { n: 3 }
tasks: { n: 2 }
events: { n: 3 }
```

## Deploying to Vercel

The app is configured for one-click Vercel deployment. `next.config.ts` uses Turbopack with `cacheComponents` removed (the config was stripped once the `dynamic = "force-dynamic"` route segment was deleted — Cache Components is incompatible with that export).

### Seed database

When the real Concord workspace is absent (the case on a fresh Vercel deployment), `lib/db.ts` generates a fallback seed database at `.seed/concord.db` containing the same demo data: 3 agents, 2 overlapping tasks, and 3 events. The page renders that data and shows an amber banner in the header pointing at `CONCORD_DB_PATH`.

To point the deployed dashboard at a live workspace, set `CONCORD_DB_PATH` in the Vercel project settings.

### Build verification

```bash
npm run build
# => Route (app) /  ○ (Static) prerendered as static content
```

The `fs.existsSync` calls in `lib/db.ts` carry `/*turbopackIgnore: true*/` comments so Turbopack doesn't bundle the whole project into the server trace.

## What I'd build next

1. **Ownership history view.** `task_ownership_events` is empty for `start_work` claims in this workspace but is populated by handoffs. A per-task timeline would show how ownership moved between agents.
2. **Message inbox.** `agent_messages` tracks inter-agent messages with delivery status. Surfacing undelivered or expired messages would expose coordination failures that the roster view can't.
3. **Handoff review.** The `reviews` and `handoffs` tables exist but aren't shown. A "review-ready" panel would mirror Concord's own `REVIEW_PACKET.md` concept.
4. **Write-side actions.** The dashboard is deliberately read-only. A future version could offer "release a stale claim" as an explicit, confirmed action, but that is a different security posture and shouldn't be bolted on casually.

## Notes on working with Concord

- Concord's schema evolves between releases. Confirm table and column names with `PRAGMA table_info(...)` .
- The official `pnpm demo` script is the fastest way to generate realistic overlap data without coordinating two live agents.
- `.concord/` ships with its own `.gitignore`. The database is local state, not something to commit.
- `task_ownership_events` being empty for `start_work` claims is current behavior worth knowing: ownership transitions are only recorded for certain operations (like handoffs), not for initial claims.
