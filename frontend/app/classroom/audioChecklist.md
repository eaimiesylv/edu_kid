# Letter A audio assets and release QA

The shipped classroom currently uses browser speech synthesis as a **temporary fallback**. No professionally recorded clips or human-reviewed phonics recordings are included. Browser voice availability, quality and pronunciation vary by device. The app neither records nor assesses spoken imitation.

`frontend/public/audio/letter-a/manifest.json` lists every exact script and filename, including `name.mp3` for the letter name /eɪ/, `introduce.mp3`, `yourTurn.mp3`, `draw.mp3`, `downOne.mp3`, `downTwo.mp3`, `across.mp3`, `find.mp3`, `retry.mp3` and `reward.mp3`. All entries are currently `available: false`. Record every listed line; put the reviewed MP3 in that directory and set its entry to `available: true`. Keep filenames and IDs stable. Text can be edited in the manifest; fallback speech and optional captions use that same text. The built-in fallback script is in `lessonConfig.ts`.

Production preparation: use a warm adult voice, clean mono recording, natural pauses, no reverb or background music, consistent perceived loudness (target around -16 LUFS, true peak below -1 dBTP), and careful consonants. Normalize/export during asset preparation; runtime volume controls cannot replace recording QA. Speech volume and optional effects are separate concerns; this build has no background music or audio effects, so there is nothing to duck or overlap. Test with headphones and real mobile speakers. Do not mark files available until reviewed.

- [ ] Every manifest file exists and matches its script; no accidental silence at either end.
- [ ] The dedicated letter name is clearly “A” /eɪ/; short /æ/ is never substituted for the name.
- [ ] SHOW → SAY → pupils → child touch → actions → three strokes → five recognition contexts → recall → reward.
- [ ] Each utterance finishes before the next essential instruction; replay cannot overlap, and pause/resume/restart cancels or resumes correctly.
- [ ] Speech is intelligible, comfortably loud, consistent, unclipped and free of noise/reverb.
- [ ] Start unlocks playback on iOS Safari and Android Chrome; replay works after Start.
- [ ] Missing/failed recordings fall back safely; a device without speech enables captions and continues visual guidance, rather than becoming stuck.
- [ ] Physical phone speakers are tested by a human. Headless browser tests do not verify pronunciation or perceived audio quality.

Phonics is intentionally deferred. If added later, supply a separately reviewed `short-a.mp3` /æ/ and `apple.mp3`, introduce this as **one common sound** of A, and explain that letters have names and may make different sounds. Do not use a generic TTS isolated phoneme or pronounce /æ/ as “ay”. Do not add phonics to the required first lesson until those recordings are reviewed.

Personalized teacher avatars remain a future hook: keep any photograph private and require explicit parental consent. This classroom reads no photographs and sends none to avatar or voice services. Existing profile/API adapters remain unchanged.
