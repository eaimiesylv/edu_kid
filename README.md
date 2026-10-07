# Bright Steps

A working A–C structured-learning MVP with a Nuxt frontend and Laravel API. Completed and outstanding work is tracked in [WORK_PLAN.md](WORK_PLAN.md).

## Run locally on this Windows workspace

Dependencies and a portable PHP 8.4 runtime are already installed. In a terminal at the project root:

```powershell
.\scripts\start-backend.ps1
```

In a second terminal:

```powershell
cd frontend
npm.cmd run dev
```

Open http://127.0.0.1:3000. Create a parent account, create a child, select a letter range and begin. No demo password or production account is seeded. If these ports are already occupied, use `start-backend.ps1 -Port 8001`, set `NUXT_PUBLIC_API_BASE=http://127.0.0.1:8001/api` in `frontend/.env` and choose another frontend port. Add that frontend origin to `FRONTEND_ORIGINS` in `backend/.env`.

Local startup uses the settings in `backend/.env`: MySQL at `127.0.0.1:3306`, database `result`, username `root`, password `root`. The portable PHP runtime has PDO MySQL enabled. The runtime in `.tools/` is a local convenience and is excluded from version control.

## Local MySQL

```powershell
.\scripts\start-backend.ps1
```

The MySQL service must be running locally and database `result` must exist. Docker is not required. Existing migrations and curriculum seeding have been verified against this database. The launcher runs outstanding migrations and the idempotent curriculum seeder without resetting existing tables.

## Fresh checkout

Install Node 22+ (Node 24 was used), PHP 8.4+ with curl, fileinfo, mbstring, openssl, PDO MySQL/SQLite and zip, and Composer. Then:

```powershell
cd backend
composer install
Copy-Item .env.example .env
php artisan key:generate
php artisan migrate --seed
cd ../frontend
npm.cmd ci
```

The Nuxt setup follows the [Nuxt installation documentation](https://nuxt.com/docs/4.x/getting-started/installation). PHP requirements are described in the [Laravel release documentation](https://github.com/laravel/docs/blob/13.x/releases.md). Runtime versions are pinned by `package-lock.json` and `composer.lock`.

## Production preview and offline testing

```powershell
cd frontend
npm.cmd run build
node .output/server/index.mjs
```

The production build caches the app shell, letter content, fonts, icons and Phaser bundle. Visit it online once before testing offline reload. Development mode intentionally does not register a service worker. HTTPS is required outside localhost. Narration uses the browser's speech synthesis; installed local voices determine offline voice availability. Recorded audio is a remaining release task.

## Structure

| Location | Responsibility |
| --- | --- |
| `frontend/app/domain` | Curriculum, evidence types, mastery rules, revision and activity selection |
| `frontend/app/services` | Canvas rendering, atomic IndexedDB storage and session transitions |
| `frontend/app/composables` | Authentication, narration, learning state and sync orchestration |
| `frontend/app/components` | Parent setup/dashboard and reusable child activities |
| `frontend/app/games` | Phaser recognition templates generated from activity configuration |
| `backend/app/Http` | API endpoints, validation and authenticated ownership checks |
| `backend/app/Services` | Entitlements, chronological evidence ingestion and mastery calculation |
| `backend/database` | Generic curriculum schema, raw attempts, per-skill mastery and revision scheduling |

No learning component is named for a particular letter. A–C is the content boundary. Additional subjects declare capabilities; activities must respect those capabilities. New subject renderers and curricula are extension work, not shipped content.

## Learning behavior

- Teach before testing: see, hear, watch, guided writing, reduced-support tracing and independent writing.
- Keep exposure, hearing, guided/independent writing, recognition, discrimination and retention separate.
- Assisted correct answers carry less weight and cannot count as independent successes.
- Mastered state requires repeated independent evidence across multiple game contexts.
- Introduce the next letter when hearing/recognition/discrimination are consistent; revisit weak writing without erasing progress.
- Change distractors, positions, choice count, motion and game templates within the selected boundary.
- Return to demonstration after repeated difficulty; distinguish interaction failure from knowledge failure.
- Follow the storyboard's 13 activity screens per letter: see, hear, watch, guided writing, practice tracing, independent writing, five recognition scenes, catch game and mixed review. End with earned stars and parent progress.
- Previous/next buttons and the step strip preserve saved work. Skipping never awards evidence; revisiting a completed activity never awards duplicate stars. Correct responses trigger a mascot/confetti celebration, respecting reduced-motion preferences.

Writing evaluation checks path coverage and precision against curriculum strokes. It is a prototype geometric scorer, not a handwriting-recognition model. Educational thresholds and writing tolerances need supervised validation before release.

## Offline sync

Attempts and their updated local snapshot are committed atomically to IndexedDB. Reconnection sends batches of up to 100 attempts. The API authorizes ownership, validates evidence and acknowledges identifiers. Retried identifiers do not double-count mastery or rewards. Server scores are rebuilt from chronologically sorted evidence, including delayed offline uploads. Queue entries are removed only after acknowledgement.

Sign-in tokens are hashed in the database, expire after seven days and are kept in session storage in the browser. Existing device learning remains available offline after the tab closes; parents sign in again for server access. Concurrent configuration changes across multiple devices currently use the most recent sync; explicit conflict resolution remains a release task.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/auth/register`, `/api/auth/login`, `/api/auth/logout` | Parent authentication |
| GET/POST | `/api/children` | Parent-owned profiles |
| PUT | `/api/children/{id}/config` | Range and current-concept override |
| GET | `/api/children/{id}/report` | Skill records, sessions and revision |
| POST | `/api/children/{id}/sessions` | Session lifecycle |
| POST | `/api/sync` | Idempotent attempt batches |
| GET | `/api/curriculum`, `/api/entitlements` | Content and centralized access rules |

## Checks

```powershell
cd backend
..\.tools\php\php.exe artisan test --compact
..\.tools\php\php.exe vendor/bin/pint --format agent
cd ../frontend
npm.cmd run test
npm.cmd run typecheck
npm.cmd run build
npm.cmd run test:e2e
cd ..
node scripts/check-functions.mjs
.tools/php/php.exe scripts/check-functions.php
```

Browser tests launch production Nuxt on port 3173 and an isolated SQLite-backed API on port 8173. They use installed Edge. Set `PLAYWRIGHT_CHANNEL=chrome` to use installed Chrome, or install a Playwright browser and adjust the channel. Set `PHP_BINARY` to your PHP executable if the portable Windows runtime is absent. Test data is isolated in `.tools/e2e.sqlite`.

The AST checkers reject functions over fifty physical lines, including nested callbacks. Dependencies and generated code are excluded. Screenshots from browser tests are saved in `artifacts/`.

After editing `frontend/app/domain/curriculum.ts`, run `node scripts/export-curriculum.mjs`, then rerun the backend curriculum seeder. This keeps the offline bundle and API seed content aligned.

## Release gaps

See the unchecked release tasks in `WORK_PLAN.md`. Paid billing, Quick Learning, curriculum beyond A–C, speech recognition, native wrappers, account recovery and recorded narration are not implemented. Automated tests retain isolated SQLite databases; the local application uses MySQL. The current npm audit reports upstream high advisories in Nuxt tooling through `braces` and `node-forge`; compatible automatic fixes were unavailable. Vitest was updated to its patched release. Review current upstream fixes before deploying.
