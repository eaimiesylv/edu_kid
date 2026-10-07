# Bright Steps work plan

## Scope and engineering rules
- Implement the specification's first milestone: structured learning for A–C.
- Frontend: Nuxt/Vue/TypeScript, Phaser recognition games, Canvas writing, PWA, IndexedDB.
- Backend: Laravel/PHP, local MySQL database `result`, authenticated parent-owned records (user override of the specification).
- Keep curriculum, activity selection, mastery, storage, rendering and API concerns separate.
- Every authored function/method must be at most 50 lines; verify with an automated checker.
- Document future features as deferred, not completed.

## Implementation tracker
- [x] Read master specification and inspect empty workspace.
- [x] Create backend and frontend scaffolds and development configuration.
- [x] Define generic curriculum, capabilities, skills and A–C content.
- [x] Implement evidence-weighted mastery, adaptive selection, progression and revision.
- [x] Implement parent authentication, child profiles and curriculum boundaries.
- [x] Implement protected parent dashboard and concept override without progress loss.
- [x] Implement voiced introduction, hearing and animated stroke demonstration.
- [x] Implement guided, reduced-support and independent Canvas writing.
- [x] Implement reusable varied recognition games with assistance and recovery.
- [x] Implement short sessions, rewards, persisted continuation and review.
- [x] Implement IndexedDB attempt queue, offline shell and idempotent API sync.
- [x] Implement backend schema, validation, ownership and reports.
- [x] Validate learning rules, API isolation, offline persistence and function sizes.
- [x] Build frontend, run backend tests and document setup/results.

## Deferred by specification
- Full alphabet, numbers, shapes, colours and body curriculum.
- Phonics, words, reading, arithmetic, Quick Learning and speech recognition.
- Billing provider, paid subscriptions, advanced reports and avatar shop.
- Professionally recorded narration and validated educational handwriting classifier.

## Validation log
- Backend migrations and idempotent curriculum seeding: passed using local SQLite.
- `php artisan test --compact`: 10 tests passed, 37 assertions.
- `npm run test`: 12 learning-engine tests passed using patched Vitest 5.
- `npm run build` and `npm run typecheck`: passed on the completed frontend.
- Final AST function-size checks: 170 JS/TS functions and 90 PHP functions passed (maximum 50 physical lines).
- `npm run test:e2e`: 3 browser tests passed against the production build and isolated API. Verified family onboarding, guided/reduced/independent writing, recognition, offline reload, queued-attempt sync, parent dashboard, mobile layout and service-worker activation.
- Browser screenshots: `artifacts/welcome-desktop.png`, `artifacts/welcome-mobile.png`, `artifacts/parent-dashboard.png`.
- Local MySQL connection verified: `127.0.0.1:3306`, database `result`, user `root`. Existing migrations were all applied; curriculum seeding succeeded. Local backend started on port 8000. PostgreSQL/Docker is no longer required by the user's selected setup.
- Dependency audit: patched Vitest; upstream Nuxt build-tool dependencies still report high advisories without a compatible fixed version. Do not deploy before reviewing updated upstream releases.

## Remaining release work
- [x] Verify migrations and curriculum seeding on the user-selected local MySQL database.
- [ ] Review upstream dependency advisories before deployment.
- [ ] Validate writing tolerance and adaptive thresholds with an early-learning specialist and real children.
- [ ] Replace browser speech synthesis with preloaded recorded narration for consistent offline voice support.
- [ ] Add account recovery/email verification and production hosting configuration.
- [ ] Add explicit conflict resolution for concurrent learning-config changes on multiple devices.

## Handoff
- Start backend: `.\scripts\start-backend.ps1` from the project root.
- Start frontend: `cd frontend`, then `npm.cmd run dev`.
- Full setup, local MySQL configuration, architecture and check commands: `README.md`.
- A–C implementation is complete; release tasks above remain open and are not implied to be finished.

## Storyboard design update
- [x] Move previous/next into a dedicated activity wrapper, vertically centred at the left/right edges. Remove duplicate bottom advancement buttons; keep the step strip below. Production build and all 4 browser checks passed after the layout change.
- [x] Implement a persisted 13-activity lesson for each selected letter: six teaching/writing stages, five recognition patterns, catch game and mixed review.
- [x] Add numbered stroke directions, replay/pause, reduced-help tracing and a blank independent-writing board.
- [x] Add previous/next and direct step navigation, preserving activity IDs and blocking duplicate rewards/evidence.
- [x] Award stars only for completed activities; incorrect writing stays retryable and skipped work earns no evidence.
- [x] Add correct-answer mascot/confetti splash, reduced-motion support and animated completion rewards.
- [x] Add moving train, hidden-letter reveal, moving catch balloons/basket, game pause/resume and parent letter navigation.
- [x] Complete browser verification: 4 checks passed, including all 13 steps, every recognition pattern, actual hidden-letter reveal clicks, pause/resume, correct-answer splash, completion with 13 earned stars, previous navigation, offline sync and PWA. Screenshots: `artifacts/letter-success.png`, `artifacts/session-complete.png`.
- [x] Domain/service checks: 16 tests passed, including all A–C sequences, navigation, resume, completion and reward deduplication. TypeScript and production build passed; backend 10 tests/37 assertions and Pint passed.
- [x] Separate authentication and learning rate-limit counters; isolate each browser run's cache without disabling throttling.

### Screen 7–17 interpretation
The reference uses a consistent dark-blue instruction title, large pink letter or writing surface, white/cream rounded card, blue bird instruction bubble, and blue audio control. Writing assistance fades across the sequence. Recognition changes scenery while preserving the target letter; learning evidence records each context independently.

| Reference screen | Implemented behavior |
| --- | --- |
| 7: See A | Dimensional pink letter and spoken introduction. |
| 8: Hear A | Repeatable audio, letter stays visible; narration playback is needed to record hearing exposure. |
| 9: Watch Writing | Animated pink strokes over a gray model, numbered starts and direction arrows, replay/pause. |
| 10: Guided Writing | Gray model and moving yellow guide dot with pointer drawing. |
| 11: Practice Writing | Dashed letter outline without animated guidance. |
| 12: Independent Writing | Blank canvas; optional example explicitly counts as assistance. |
| 13: Recognition | Five separate screens: road lanes, underwater bubbles, sky balloons, moving train and hidden letters revealed before choosing. |
| 14: Letter Game | Moving target/distractor balloons, basket catch animation and pause/resume. |
| 15: Mixed Review | Shuffled choices from the configured letter range and repeatable spoken target. |
| 16: Complete | Earned star total, animated stars, continue, previous step and protected parent progress entry. |
| 17: Parent Progress | Actual per-letter/per-skill evidence, concept status and previous/next letter controls. |

Navigation permits exploration without manufacturing mastery. A lesson sequence stays on its selected concept; the existing adaptive readiness rules choose the next concept at the start of a later session. A–C are implemented; further letters remain release work.
- [x] Fix development CSS resolution by registering each modular stylesheet directly in Nuxt. Browser verification on the local dev server passed with no JavaScript or failed-resource errors; woodland background and grid styling loaded correctly.
- [x] Replace muted styling with dark-blue text, glossy purple controls, pink letters and rounded panels.
- [x] Add generated woodland scenery and transparent blue bird mascot.
- [x] Separate account, child profile, subject selection and letter-range setup.
- [x] Add continue/new-session welcome choices, reward styling and parent concept progress.
- [x] Add road, underwater bubbles, balloons, train and hidden-letter recognition templates.
- [x] Split styling into modular base, welcome, onboarding, learning, parent and responsive files.
- [x] Production build, TypeScript and 12 learning-engine tests passed; 181 JS/TS and 90 PHP functions satisfy the 50-line limit.
- [x] Final browser verification: all 3 checks passed, covering separate setup screens, writing, recognition, offline reload/sync, parent progress, mobile layout and PWA control. Backend: 10 tests passed, 37 assertions.
- Additional subjects retain Coming soon status. Profile characters currently use emoji illustrations.

### Generated artwork
Mode: built-in image generation, new assets, inspired by the user-provided storyboard. Original generated files are retained.
- `frontend/public/art/woodland.png`: “Use case: illustration-story. Generate a production app background asset inspired by the attached Bright Steps children's learning storyboard: a beautifully rendered cheerful 3D cartoon woodland clearing, bright blue sky, fluffy white clouds, rounded lime green trees and lush bushes along the sides, tiny colourful flowers, soft rolling hills, pale sandy winding path and sunny grass at the bottom. Wide landscape composition, calm open sky and open central clearing leaving ample uncluttered space for interface content. Toy-like dimensional glossy gentle forms, vibrant cyan, emerald, lime and warm yellow, playful preschool learning game aesthetic. No text, no letters, no logos, no characters, no UI, no watermarks. This is background artwork, not a screenshot.”
- `frontend/public/art/bluebird.png`: “Use case: illustration-story. Asset type: transparent character cutout for the Bright Steps preschool app. Create a single adorable happy plump blue baby bird mascot, front facing, spreading little wings to welcome a child, huge expressive dark eyes with glossy highlights, small turquoise feather tuft, yellow-orange beak and orange feet, white face cheeks and white soft belly. Fully visible full body, centred with clear space around entire silhouette. Polished bright dimensional 3D cartoon toy style matching a colourful preschool learning app storyboard, sapphire blue wing feathers, cyan head, gentle warm lighting, delighted friendly smile. No text, no letters, no props, no scenery, no floor or cast shadow, no logo, no watermark. Actual transparent background.”
