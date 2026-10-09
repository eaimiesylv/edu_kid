# Bright Steps

Bright Steps opens as a child-first, frontend-only uppercase Letter A classroom. The existing Three.js renderer and three characters are retained. A is central and twice as large as the dimmed distractors during introduction, then moves to a clean board. The teacher models the letter name, allows spoken imitation (not assessed), and both pupils demonstrate touching A. The child taps to make A jump and move to a star without reading an action toolbar. A moving guide demonstrates the three strokes, and ordered tracing checks coverage, direction and precision with forgiving tolerances. Five seeded recognition contexts shuffle positions and colours independently with equal-sized choices, then a touch recall and brief celebration finish the lesson.

Speech, animations and input run through a declarative, cancellable state machine. A large speaker replays narration (or the active tracing stroke); mute, speed, volume, captions, pause, restart and phase revisits are available to grown-ups. Progress and attempts are saved locally with phase-level resume; a tracing phase restarts its three strokes when resumed. Lesson completion is practice evidence, not a claim of mastery or verified pronunciation. No live backend is required.

The earlier multi-letter application and Laravel API remain in the repository, but they are not required or used by this prototype. Completed and outstanding platform work is tracked in [WORK_PLAN.md](WORK_PLAN.md).

## Run locally on this Windows workspace

```powershell
cd frontend
npm.cmd run dev
```

Open http://127.0.0.1:3000 and choose **Start**. No backend, account, database or setup flow is required.

The prototype does not read backend environment variables or connect to a database. The optional PHP runtime in `.tools/` is only needed for legacy backend work and is excluded from version control.

## Optional legacy backend

```powershell
.\scripts\start-backend.ps1
```

This optional setup expects the local MySQL service and database described in `backend/.env`. It is not needed for the Letter A prototype.

## Fresh checkout

For the frontend-only prototype, install Node 22+ and run:

```powershell
cd frontend
npm.cmd ci
npm.cmd run dev
```

To work on the legacy backend as well, install PHP 8.4+ with curl, fileinfo, mbstring, openssl, PDO MySQL/SQLite and zip, and Composer. Then:

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

## Production preview

```powershell
cd frontend
npm.cmd run build
node .output/server/index.mjs
```

Validate this classroom independently of the legacy account-based tests:

```powershell
cd frontend
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npx.cmd playwright test --config playwright.classroom.config.ts
```

The prototype is online-first and does not register a service worker or cache lesson assets for offline use. Local progress storage does not make it an offline/PWA app.

## Replace the temporary voice

No professionally recorded clips are included. Browser TTS is a temporary fallback with device-dependent quality and pronunciation. Add the reviewed recordings named in `frontend/public/audio/letter-a/manifest.json` and mark each corresponding `available` value `true`. The manifest contains the exact speech script and supports future human recordings. Failed/missing recordings fall back to browser speech; if speech is unavailable, optional captions turn on and visual interaction continues.

See [the audio asset and QA checklist](frontend/app/classroom/audioChecklist.md). Phonics, real pronunciation assessment and photo-derived avatars are deferred. The letter-name clip must say /eɪ/; no short-vowel /æ/ clip is played or synthesized in this lesson. Photographs are neither read nor uploaded. Audio quality and real iOS/Android speaker/unlock behavior still need human/device QA.

Browser tests use a deterministic speech driver to validate sequencing, cancellation and absence of overlap, not audio quality. They also exercise failed-asset fallback and a device with no speech. Legacy account/PWA browser tests in `adventure.spec.ts` and `pwa.spec.ts` target the earlier application and are retained separately; use the classroom config for this frontend. Existing domain tests still run with `npm.cmd test`. There is currently no configured lint command or ESLint dependency.

## Structure

| Location | Responsibility |
| --- | --- |
| `frontend/app/components/BrightStepsLearning.vue` | Child-first orchestration, audio controls, gated parent menu and saved progress |
| `frontend/app/components/ThreeLearningStage.vue` | Three.js classroom, animated teacher/classmates, table-to-board letter motion and tap raycasting |
| `frontend/app/classroom` | Declarative lesson, state machine, narration, responsive layout, scene controllers, tracing/recognition validation and local progress |
| `frontend/app/components/TracingActivity.vue` | Board-aligned SVG demonstration and ordered finger tracing |
| `frontend/app/domain` | Curriculum, evidence types, mastery rules, revision and activity selection |
| `frontend/app/services` | Canvas rendering, atomic IndexedDB storage and session transitions |
| `frontend/app/composables` | Authentication, narration, learning state and sync orchestration |
| `frontend/app/components` | Parent setup/dashboard and reusable child activities |
| `frontend/app/games` | Phaser recognition templates generated from activity configuration |
| `backend/app/Http` | API endpoints, validation and authenticated ownership checks |
| `backend/app/Services` | Entitlements, chronological evidence ingestion and mastery calculation |
| `backend/database` | Generic curriculum schema, raw attempts, per-skill mastery and revision scheduling |

No learning component is named for a particular letter. A–C is the content boundary. Additional subjects declare capabilities; activities must respect those capabilities. New subject renderers and curricula are extension work, not shipped content.

## Legacy learning behavior

The following multi-letter learning behavior describes the earlier application, not the current standalone Letter A prototype:
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

## Legacy offline sync

Offline synchronization belongs to the previous account-based application and is not used by the current prototype.
Attempts and their updated local snapshot are committed atomically to IndexedDB. Reconnection sends batches of up to 100 attempts. The API authorizes ownership, validates evidence and acknowledges identifiers. Retried identifiers do not double-count mastery or rewards. Server scores are rebuilt from chronologically sorted evidence, including delayed offline uploads. Queue entries are removed only after acknowledgement.

Sign-in tokens are hashed in the database, expire after seven days and are kept in session storage in the browser. Existing device learning remains available offline after the tab closes; parents sign in again for server access. Concurrent configuration changes across multiple devices currently use the most recent sync; explicit conflict resolution remains a release task.

## Legacy API

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
