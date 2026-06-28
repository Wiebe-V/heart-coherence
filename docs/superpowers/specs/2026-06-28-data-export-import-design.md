# Data Export / Import (Device Transfer) — Design

**Date:** 2026-06-28
**Status:** Approved

## Goal

Let a user move their full app state to another device: export everything to a
single backup file, then import it elsewhere. This transfers their training
**history** and their **settings** in one step.

## Decisions (from brainstorming)

- **Scope:** one backup file containing **all sessions + all settings**.
- **Mechanism:** a downloaded/uploaded **JSON file**. The app is fully local
  (IndexedDB + localStorage, no backend), so a file is the only
  device-independent transfer medium. No cloud, no QR.
- **Import behavior:** **merge sessions** (de-duplicated by session `id`, so
  re-importing the same file is safe) and **replace settings** with the
  imported ones.
- **UI placement:** a new **"backup & transfer"** section at the bottom of the
  existing settings drawer.
- **Structure:** Approach A — a new pure `lib/backup.ts` core (build / serialize
  / parse+validate) plus thin UI wiring. Mirrors the repo's pure-`lib` +
  thin-component pattern.

### Out of scope (YAGNI)

- The onboarding "seen" flag (`coherence.onboarded.v1`) is **not** transferred —
  it isn't user data or a setting, and a fresh device showing onboarding once is
  harmless.
- No encryption, no compression, no partial/selectable import, no schema
  migration beyond a version stamp.
- The existing per-session JSON/CSV export on the history page is left untouched.

## Data surface

- **Sessions** — IndexedDB `coherence` DB, `sessions` object store
  (`keyPath: "id"`), one `SessionRecord` each.
- **Settings** — localStorage `coherence.settings.v1`, a `Settings` object,
  validated by `mergeSettings`.

## File format

A versioned JSON envelope:

```json
{
  "format": "coherence-backup",
  "version": 1,
  "exportedAt": 1700000000000,
  "settings": { /* Settings */ },
  "sessions": [ /* SessionRecord[] */ ]
}
```

- `format` + `version` let import reject unrelated/incompatible files clearly.
- `exportedAt` (epoch ms) is informational; passed in by the caller so the
  builder stays pure.

## Architecture

### New file — `lib/backup.ts` (pure, unit-tested)

- `BACKUP_FORMAT = "coherence-backup"`, `BACKUP_VERSION = 1`.
- `interface BackupFile { format; version; exportedAt; settings; sessions }`.
- `buildBackup(settings: Settings, sessions: SessionRecord[], exportedAt: number): BackupFile`
  — assemble the envelope.
- `serializeBackup(backup: BackupFile): string` — pretty-printed JSON.
- `parseBackup(text: string): ParseResult` — the only place that trusts external
  input. Returns a discriminated result:
  - `{ ok: true; settings: Settings; sessions: SessionRecord[]; skipped: number }`
  - `{ ok: false; error: string }`

  Behavior:
  - Invalid JSON → `{ ok: false, error }`.
  - Missing/wrong `format`, or `version` newer than `BACKUP_VERSION` →
    `{ ok: false, error }`.
  - `settings` run through the existing `mergeSettings` (sanitizes / fills
    defaults), so a missing or partial settings object yields valid defaults.
  - `sessions` filtered by an internal `isValidSession` guard; malformed entries
    are dropped and counted in `skipped`. A missing `sessions` array → `[]`.
- `isValidSession(v: unknown): v is SessionRecord` (internal) — requires
  `id: string`; finite numbers for `startedAt`, `durationS`, `pace`,
  `avgCoherence`, `peakCoherence`; `coherenceTrace`/`hrTrace` arrays of finite
  numbers; `achievement` optional (default `0`, matching existing UI tolerance).

### `lib/db.ts` — add one function

- `bulkPutSessions(sessions: SessionRecord[]): Promise<void>` — `put` each in a
  single `readwrite` transaction. `put` keys on `id`, so importing a session
  that already exists overwrites it in place → natural de-dup / idempotent
  re-import.

### `lib/settingsStore.ts` — replace settings

- Reuse the existing `update(partial)` with the full imported `Settings` object;
  passing every key overlays all of them, which is the desired "replace". No new
  store method needed.

### UI — `components/SettingsDrawer.tsx`

A new "backup & transfer" section at the bottom:

- **export** button → `listSessions()`, `buildBackup(settings, sessions, Date.now())`,
  `serializeBackup`, then `downloadText("coherence-backup-YYYY-MM-DD.json",
  "application/json", json)` (reuse existing `downloadText`).
- **import** button → triggers a hidden `<input type="file" accept="application/json">`.
  On change: read the file text, `parseBackup`. On `ok:false`, show the error.
  On `ok:true`, `bulkPutSessions(sessions)` then `update(settings)`, and show a
  result line: `imported N sessions · settings replaced` (plus
  `· M skipped` when `skipped > 0`).
- A short status line (`idle` / `error` / `done`) gives inline feedback. Errors
  are surfaced, never silent.

## Data flow

```
export:  settings(store) + listSessions(idb)
           → buildBackup → serializeBackup → downloadText → file

import:  file → text → parseBackup
           ├─ ok:false → show error
           └─ ok:true  → bulkPutSessions(idb)  (merge by id)
                       → settingsStore.update   (replace)
                       → show "imported N · …"
```

History on the other device appears on next visit to `/history` (it reloads on
mount); settings apply live through the store.

## Error handling

- All file/JSON/validation failures resolve to a user-visible message via the
  `parseBackup` result or a try/catch around file reading — no throws reach the
  UI uncaught.
- IndexedDB unavailable (SSR/private mode): export/import handlers are
  client-only (drawer is in an `ssr:false`-friendly client tree); a failed
  `bulkPutSessions` is caught and reported.

## Testing

- `lib/__tests__/backup.test.ts`:
  - `buildBackup` produces the envelope with correct format/version/fields.
  - `serializeBackup` → `parseBackup` round-trips settings + sessions.
  - `parseBackup` rejects: invalid JSON, wrong `format`, future `version`.
  - `parseBackup` drops malformed sessions and counts `skipped`.
  - `parseBackup` fills settings defaults from a partial/missing settings object.
  - `isValidSession` accepts a valid record, rejects bad shapes.
- `lib/db.ts`: `bulkPutSessions` covered if the existing db test harness
  supports it; otherwise the merge-by-id behavior is asserted via `put`
  semantics in backup-level tests. (db.ts has no existing test file — keep DB
  changes minimal and rely on idb's documented `put` behavior.)
- UI wiring is thin and not unit-tested, consistent with the rest of the app.
```
