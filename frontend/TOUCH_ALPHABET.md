# Touch alphabet classroom

The default frontend reuses the existing Three.js classroom. Four completed touches lead into object recognition, letter recognition, collection, and five independent first-answer trials. Mastery requires four correct first answers across at least three arrangements. Repeated mistakes return to guided practice. The current UI supports A only: the left selector lists A-Z, with B-Z marked coming soon. Learning and recognition each have a level indicator and progress bar. A finishes with a completion screen and an optional replay button. Classroom characters are hidden, and correct answers receive a short, silent star animation. Attempts are stored locally; a new visit starts the A lesson again.

`app/classroom/touchLesson.ts` defines the starting mastery and interaction thresholds. These are configurable product defaults, not validated developmental standards.

Audio permits A-Z letter names and the brief corrective feedback `Oops!`. Visual instructions are never passed to speech. Playback starts with the first letter touch, and input remains locked until playback and animation finish. Reviewed recordings are not supplied: browser speech is the current fallback and depends on installed voices.

To supply recordings, place them in `public/audio/alphabet/` and add entries to `manifest.json`, for example:

```json
{ "A": { "src": "/audio/alphabet/A.mp3", "available": true } }
```

Exploration letters A-C reuse extruded geometry. Recognition uses the same canvas font and material for every letter; D-Z also use these meshes during exploration. The easy distractor is a simple 3D car. Recognition and collection have automatic, unscored demonstrations. Correct answers receive a silent congratulatory animation, which completes before the next question or collection selection is enabled. No backend changes or API calls are required.

Validation: `npm run typecheck`, `npm test`, `npm run build`, and `npx playwright test --config playwright.classroom.config.ts`. The classroom browser tests cover desktop/mobile interaction, collection, first-letter mastery, A completion and replay, speech restrictions, duplicate-tap guards, first-answer scoring, and guided recovery after repeated errors. Other older activity browser tests target the previous UI.
