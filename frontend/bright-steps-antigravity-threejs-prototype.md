# Bright Steps --- Antigravity Three.js Prototype Specification

## Objective

Build the first working prototype of **Bright Steps**, an interactive
early-learning application for children approximately ages 3--7.

The classroom image uploaded with this specification is the **primary
visual reference**. Recreate its warm, colourful, polished 3D/cartoon
preschool feeling as an interactive learning stage. Do not simply use
the image as a static background unless implementing a temporary 2.5D
prototype.

For this prototype, focus on **Letter A only**. The app is **online-only
for now**. Do not implement offline mode, service workers, PWA caching,
IndexedDB synchronization, authentication, subscriptions, parent
dashboards, Laravel, PostgreSQL, or the full curriculum yet. The purpose
is to validate behaviour, interaction and learning quality first.

## Product Principle

The child should feel that they are **playing inside an animated
learning environment**, not navigating Lesson, Practice, Game, Test or
Writing modes. Teaching, repetition, recognition and assessment happen
naturally inside one continuous experience.

The child must not need to read instructions. Use spoken audio,
animation, character reactions and large interactive objects.

Primary interaction: **TAP / CLICK**.

## Visual Direction

Use the supplied classroom image as reference for: - warm preschool
classroom atmosphere; - colourful educational toys; - physical-looking
oversized letters; - rounded toy-like forms; - soft materials and
lighting; - warm sunlight and gentle shadows; - expressive friendly
characters; - polished animated-film-like composition; - inviting, safe
and joyful mood.

Visual fidelity matters, but smooth interaction and clarity matter more
than photorealism. If full real-time 3D is too heavy, use a hybrid 2.5D
approach with layered classroom art, parallax, lightweight characters
and real interactive 3D learning objects.

During teaching and recognition, reduce visual competition. Background
objects and characters may remain visible, but the learning target must
be obvious.

## Technology

Use: - TypeScript - Nuxt - Vue 3 - Three.js

Three.js renders the learning stage. Vue/Nuxt manages application state
and the learning sequence.

Useful Three.js features: - `GLTFLoader` for `.glb/.gltf`; -
`AnimationMixer` for character/model animations; - `Raycaster` for
tap/click detection; - camera interpolation; - object transforms for
bounce, shake, move and scale; - simple particles/effects; - optimized
lights, shadows and materials.

Keep the renderer separate from learning logic.

## Architecture

``` text
Nuxt Application
├── Learning Page
├── Sequence Controller
├── Audio Controller
├── Attempt/Evidence Store
└── Three.js Learning Stage
    ├── Scene
    ├── Camera
    ├── Lighting
    ├── Classroom
    ├── Characters
    ├── Letters / Learning Objects
    ├── Effects
    └── Raycasting / Input
```

Three.js handles what is visible and animated. The learning controller
decides what happens next, whether a tap is correct, when hints appear
and when difficulty changes.

Do not hard-code the architecture around A. Prefer generic operations
such as:

``` ts
showLetter("A")
moveLetter("A", position)
bounceLetter("A")
shakeLetter("A")
focusCameraOn("A")
speak("letter-a")
showChoices(["A", "O"])
waitForTap()
celebrate("A")
```

## Letter A Learning Script

### Scene 1 --- Enter Classroom

Gently reveal the classroom. Characters have subtle idle animation such
as blinking, breathing and small head/hand movement. Avoid distracting
constant motion.

A character notices the child and waves.

Audio: \> "Hello!"

Then: \> "Come and play!"

No menu. Continue automatically.

### Scene 2 --- Meet A

Visually suppress unrelated letters. A character presents one large,
clear uppercase **A**.

Camera gently focuses on A.

As soon as A is clearly visible: \> **"A."**

A gently pulses/bounces.

After about 1.5--2 seconds: \> **"A."**

Repeat enough to establish: \> SEE A → HEAR "A"

Do not run an endless audio loop.

### Scene 3 --- Teach the Tap

Place A clearly on the table/stage.

Audio: \> **"Touch A."**

A is the only meaningful target.

When A is tapped: 1. A jumps/bounces. 2. Play a pleasant short sound. 3.
Show a small sparkle effect. 4. Character smiles/claps. 5. Pronounce
**"A!"**

If the child does nothing: - \~3 sec: A gently pulses; - \~5 sec:
pronounce "A"; - \~7 sec: character points; - \~9 sec: optional animated
hand demonstrates a tap.

Stop assistance once the child interacts.

### Scene 4 --- Play With A

Move A to another obvious position.

Pronounce: \> "A."

Child taps it. A reacts.

Repeat a small number of times with reactions such as jump, wobble,
brief spin or sparkle. Movement must remain slow/easy enough that this
is not a motor-skills test.

### Scene 5 --- Easy Recognition

Introduce one visually different distractor, initially **O**.

``` text
A                 O
```

Both should have equal size, brightness and prominence. Do **not**
glow/highlight A before the response.

Audio: \> **"Find A."**

Wait for the first tap.

#### Correct first tap

If A is tapped: - A jumps; - pronounce "A!"; - brief celebration; -
record independent success; - continue.

#### Wrong first tap

If O is tapped: - O gently wiggles; - no harsh red X or buzzer; - audio:
**"Let's find A."** - after a short delay, pronounce A again and
optionally give A a gentle hint pulse; - allow another attempt.

### Scene 6 --- Change Position

Swap positions:

``` text
O                 A
```

Audio: \> "Find A."

Do not highlight A unless help is needed. Later vary horizontal/vertical
positions. The child must learn the shape, not "tap left".

### Scene 7 --- Increase Choices

Only after successful easier recognition, progress to:

``` text
B          A          C
```

Audio: \> "Find A."

All choices have the same presentation style. Correct tap advances.
Wrong tap triggers gentle reteaching. Do not increase difficulty if the
child is struggling.

### Scene 8 --- Recognition as Play

Use the same recognition skill inside a playful classroom event. For
example, a toy train enters with:

``` text
[B] [A] [C]
```

Audio: \> "Find A."

The child taps A. The train reacts/moves, characters celebrate briefly,
and "A!" is pronounced.

A balloon, toy-block or box version can be substituted. Implement only
one initially.

The academic interaction remains: \> listen → identify → tap

The animation after the tap provides the excitement.

### Scene 9 --- Independent Recognition

Present 2--3 letters:

``` text
B          A          C
```

No glow, pointing, animated hand, special colour or clue.

Audio only: \> **"Find A."**

Record the child's **first tap**. This is the strongest recognition
evidence.

### Scene 10 --- Completion

When enough recognition evidence exists: - make A prominent; - pronounce
"A!"; - characters celebrate; - show a short star/sparkle effect; - end
the prototype cleanly.

Do not build B learning yet unless the generic architecture makes it
trivial.

## Evidence Tracking

Track at minimum:

``` ts
interface RecognitionAttempt {
  target: string
  choices: string[]
  firstTap: string | null
  firstTapCorrect: boolean
  wrongTaps: number
  hintsUsed: number
  eventuallyCorrect: boolean
  responseTimeMs: number
  assistanceLevel: number
}
```

Memory-only storage is sufficient for this prototype. A developer-only
debug panel is acceptable, but never show scores/JSON to the child.

## Simple Adaptive Rules

No AI is required.

``` text
Repeated correct first taps
→ reduce hints
→ vary position
→ increase choices
→ independent recognition
```

If struggling:

``` text
wrong tap
→ gentle feedback
→ repeat pronunciation
→ delayed hint
→ reduce number of choices
→ retry with a new arrangement
```

One accidental wrong tap must not restart the whole session.

Eventual success after random tapping is not equivalent to an immediate
correct first tap.

## Rapid Random Tapping

Detect obviously rapid taps across multiple options. Treat them as
uncertain evidence. If detected: - pause briefly; - calm the scene; -
show A clearly again; - pronounce A; - retry with fewer choices.

## Audio

Audio is fundamental because the learner may not read.

Requirements: - automatically pronounce A on introduction; - speak
instructions; - prevent overlapping audio; - stop/cancel previous audio
when moving on; - use short phrases; - leave enough silence for a
response.

Suggested audio keys:

``` text
greeting
come-and-play
letter-a
touch-a
find-a
try-again
celebrate-a
```

Recorded voice is preferred eventually. Browser speech synthesis can be
a temporary placeholder if the audio layer makes later replacement easy.

## Characters

Characters should teach, not merely decorate.

Useful states: - idle; - wave; - look at target; - point; - clap; -
celebrate; - think; - gentle retry reaction.

One functional character is enough for the first prototype if multiple
high-quality animated models are unavailable. Keep architecture
extensible.

## Camera

Use camera movement to direct attention: - wide classroom view
initially; - gentle push-in when A appears; - medium/table view during
recognition; - subtle focus change for a game event.

Avoid fast zooms, spinning and aggressive movement.

## Feedback

Correct: - bounce; - sparkle; - pleasant sound; - character
smile/clap; - pronounce "A!".

Incorrect: - gentle wiggle; - neutral soft sound; - supportive prompt; -
delayed hint.

Never use harsh buzzers, scary effects, a large red X, punishment or
character disappointment.

## Child UX

The prototype must work without reading.

Use large touch targets. No hamburger menu, score counter, timer
pressure, leaderboard or text-heavy instructions inside the learning
scene.

The core child loop is: \> **watch → listen → tap → see reaction**

## Performance

The prototype is online-only, but code with eventual mobile/Android use
in mind: - avoid unnecessary high-poly geometry; - optimize textures; -
limit expensive transparency; - use shadows carefully; - minimize
dynamic lights; - dispose WebGL resources and listeners correctly; -
lazy-load nonessential assets where useful.

Do **not** implement offline caching yet.

## Responsive Behaviour

Optimize the child learning scene for landscape. Desktop should work for
development. On small screens, preserve large learning objects and touch
targets by adapting camera/framing rather than shrinking everything.

## Accessibility / Safety

-   Do not rely on colour alone.
-   Avoid flashing effects.
-   Avoid rapid repeated motion.
-   Keep audio comfortable.
-   No external links in Child Mode.
-   Spoken instructions must carry the experience.

## Do Not Build Yet

Do not spend prototype time on: - offline mode; - service workers/PWA
caching; - IndexedDB sync; - Laravel/PostgreSQL; - authentication; -
parent dashboard; - subscription/payment; - Android packaging; - full
alphabet; - numbers/shapes/colours/body parts; - reading curriculum; -
handwriting grading; - AI; - complex mastery algorithms; - world map; -
many mini-games.

## Code Quality

Use TypeScript and keep responsibilities separated. Avoid one giant
Three.js file. Separate scene setup, input, audio, animation and
learning sequence. Clean up event listeners/WebGL resources.

Suggested conceptual structure:

``` text
components/learning/LearningStage.vue

three/
  createScene.ts
  createCamera.ts
  createLights.ts
  input/TapRaycaster.ts
  objects/LetterObject.ts
  characters/CharacterController.ts
  animation/AnimationController.ts
  effects/CelebrationEffect.ts

learning/
  SequenceController.ts
  RecognitionEngine.ts
  AssistanceController.ts
  types.ts

audio/AudioController.ts
data/concepts/letters.ts
```

This is guidance, not a rigid folder requirement.

## First Milestone

Before elaborate assets, make this behaviour work with simple
placeholder geometry:

``` text
classroom/stage
→ A appears
→ audio "A"
→ A moves/bounces
→ child taps A
→ positive reaction
→ O appears
→ audio "Find A"
→ child taps A or O
→ correct/wrong behaviour
→ swap positions
→ independent recognition
→ completion
```

Once this is stable, improve visual fidelity toward the uploaded
classroom reference.

## Success Criteria

The prototype succeeds if a young child can, with little/no adult
explanation: 1. enter the scene; 2. notice A; 3. hear "A"; 4. discover
that A can be tapped; 5. tap A; 6. understand "Find A"; 7. distinguish A
from another letter; 8. receive gentle help after a wrong tap; 9.
independently identify A on a later first attempt; 10. enjoy the
experience enough to want to continue.

## Final Experience Goal

Create **an animated preschool playroom where friendly characters and
objects naturally teach through seeing, hearing, touching and playing**.

The child should never feel that they entered a quiz.

For this first prototype, optimize around one question:

> **Can a child learn to visually recognize A while enjoying the
> experience and understanding what to do without constant adult
> instruction?**
