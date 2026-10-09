<script setup lang="ts">
import { lesson, speech, phaseById, recognitionExercises, type PhaseDefinition, type InputKind, type SpeechId } from '../classroom/lessonConfig'
import { LessonStateMachine, LessonClock } from '../classroom/lessonStateMachine'
import { NarrationManager, BrowserNarrationDriver } from '../classroom/narrationManager'
import { ProgressStore, newProgress } from '../classroom/progressStore'
import { RecognitionActivity } from '../classroom/recognitionActivity'
const stage = ref<{ animate: (action: import('../classroom/lessonConfig').SceneAction, signal: AbortSignal) => Promise<void> }>()
const traceSurface = ref<{ replayGuide: () => Promise<void> }>()
const phase = ref('idle'), waiting = ref<InputKind | null>(null)
const phaseSignal = shallowRef<AbortSignal>()
const sceneReady = ref(false), audioReady = ref(false), started = ref(false), paused = ref(false)
const caption = ref(''), captions = ref(false), muted = ref(false), rate = ref(.9), volume = ref(.85)
const gate = ref(false), parentOpen = ref(false), hinted = ref(false), errors = ref(''), wrong = ref(0)
const finished = ref(false)
const board = ref({ left: 0, top: 0, width: 0, height: 0 })
const store = new ProgressStore(), progress = ref(newProgress())
const clock = new LessonClock()
let began = 0
let narration: NarrationManager | undefined
let recognition: RecognitionActivity | undefined
const basicChoices = ['B', 'A', 'C'], soloChoice = ['A']
const exercises = computed(() => recognitionExercises(progress.value.seed))
const exercise = computed(() => exercises.value.find(row => row.id === phase.value))
const choices = computed(() => exercise.value?.choices ?? (['recall', 'reward'].includes(phase.value) ? soloChoice : basicChoices))
const tracing = computed(() => ['trace-demo', 'trace'].includes(phase.value) && waiting.value === 'trace')
const boardStyle = computed(() => ({ left: `${board.value.left}px`, top: `${board.value.top}px`, width: `${board.value.width}px`, height: `${board.value.height}px` }))
const accuracy = computed(() => { const attempts = progress.value.attempts.filter(row => row.phase.startsWith('recognition-')); return attempts.length ? Math.round(attempts.filter(row => row.correct).length / attempts.length * 100) : 0 })
const machine = new LessonStateMachine({
  enter(definition: PhaseDefinition, signal) {
    narration?.cancel()
    phase.value = definition.id; phaseSignal.value = signal; waiting.value = null; hinted.value = false; wrong.value = 0; began = Date.now()
    const config = exercises.value.find(row => row.id === definition.id)
    recognition = config ? new RecognitionActivity(config) : undefined
    progress.value.resume = definition.id; store.save(progress.value)
  },
  say: async (id, signal) => { await narration?.speak(id, signal) },
  animate: async (action, signal) => { await nextTick(); await stage.value?.animate(action, signal) },
  wait: (ms, signal) => clock.wait(ms, signal),
  waiting: kind => { waiting.value = kind; if (kind) began = Date.now() },
  complete(id) { if (!progress.value.completed.includes(id)) progress.value.completed.push(id); if (id === 'reward') finished.value = true; store.save(progress.value) },
  error() { errors.value = 'Please restart the lesson to try again.' },
})
async function begin() {
  if (started.value || !sceneReady.value || !audioReady.value) return
  narration?.unlock() // Must stay synchronous with the explicit user gesture.
  started.value = true; setPaused(false)
  const saved = phaseById(progress.value.resume) ? progress.value.resume : 'welcome'
  void machine.start(saved === 'reward' ? 'welcome' : saved)
}
function setPaused(value: boolean) { paused.value = value; clock.paused = value; if (value) narration?.pause(); else narration?.resume() }
async function tapLetter(value: string) {
  if (!started.value || paused.value || waiting.value !== 'tap') {
    if (phase.value === 'see' && value === 'A' && phaseSignal.value) await narration?.replay(phaseSignal.value)
    return
  }
  const answer = recognition?.select(value)
  if (recognition && !answer) return
  const correct = answer?.correct ?? value === 'A'
  if (correct && !machine.accept('tap', true)) return
  progress.value.attempts.push({ phase: phase.value, selected: value, correct, assisted: hinted.value, responseTimeMs: Date.now() - began })
  store.save(progress.value)
  if (!correct) {
    wrong.value++
    if (wrong.value >= 2 && !hinted.value) {
      hinted.value = true
      if (phaseSignal.value && !narration?.busy) await narration?.speak('hint', phaseSignal.value)
    } else if (wrong.value === 1 && phaseSignal.value && !narration?.busy) await narration?.speak('retry', phaseSignal.value)
  }
}
function traced() {
  if (paused.value) return
  if (phase.value === 'trace') { progress.value.tracingCompleted = true; store.save(progress.value) }
  machine.accept('trace', true)
}
function traceAttempt(correct: boolean) { progress.value.traceAttempts++; store.save(progress.value) }
async function tracingSpeech(id: SpeechId) { if (phaseSignal.value) await narration?.speak(id, phaseSignal.value) }
function replay() {
  if (phase.value === 'trace' && traceSurface.value) { void traceSurface.value.replayGuide(); return }
  if (phaseSignal.value && !paused.value) void narration?.replay(phaseSignal.value).catch(() => {})
}
function toggleMute() { muted.value = !muted.value; narration?.setMuted(muted.value) }
function openParent() { gate.value = true; setPaused(true) }
function closeParent() { gate.value = false; parentOpen.value = false; setPaused(false) }
function revisit(id: string) {
  gate.value = false; parentOpen.value = false; errors.value = ''; started.value = true; finished.value = false
  narration?.unlock(); setPaused(false); void machine.start(id)
}
function restart() { machine.stop(); narration?.cancel(); progress.value = newProgress(); store.save(progress.value); revisit('welcome') }
watch([rate, volume], () => { if (narration) { narration.settings.rate = rate.value; narration.settings.volume = volume.value } })
onMounted(async () => {
  progress.value = store.load()
  narration = new NarrationManager(new BrowserNarrationDriver(), text => { caption.value = text }, () => { captions.value = true })
  narration.settings.muted = muted.value
  await narration.preload(); audioReady.value = true
})
onBeforeUnmount(() => { machine.stop(); narration?.dispose() })
</script>

<template>
  <main class="learning-world" :data-phase="phase" :data-waiting="waiting ?? 'none'" :data-paused="paused">
    <ThreeLearningStage ref="stage" :phase="phase" :choices="choices" :exercise="exercise" :enabled="!paused && (waiting === 'tap' || phase === 'see')" :hinted="hinted" :paused="paused" @ready="sceneReady = true" @select="tapLetter" @board-layout="board = $event" />
    <header class="classroom-header">
      <div class="classroom-brand" aria-label="Bright Steps"><span aria-hidden="true">&#10022;</span> Bright<span>Steps</span></div>
      <div class="audio-controls">
        <button class="round-control speaker-control" aria-label="Replay instruction" :disabled="!started || paused" @click="replay"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M4 12h6l8-7v22l-8-7H4z"/><path d="M23 10q9 6 0 12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg></button>
        <button class="round-control" :aria-label="muted ? 'Unmute narration' : 'Mute narration'" :aria-pressed="muted" @click="toggleMute"><span aria-hidden="true">{{ muted ? '&#215;' : '&#9835;' }}</span></button>
        <button class="round-control parent-control" aria-label="Parent and teacher menu" @click="openParent"><svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="11" r="6"/><path d="M5 29v-5a11 11 0 0 1 22 0v5z"/></svg></button>
      </div>
    </header>
    <button v-if="!started" class="start-lesson" :disabled="!sceneReady || !audioReady" @click="begin"><span aria-hidden="true">&#9654;</span> {{ progress.resume !== 'welcome' && progress.resume !== 'reward' ? 'Continue' : 'Start' }}</button>
    <div v-if="tracing && phaseSignal" class="tracing-plane" :style="boardStyle"><TracingActivity ref="traceSurface" :key="phase" :mode="phase === 'trace-demo' ? 'demo' : 'trace'" :paused="paused" :signal="phaseSignal" :speak="tracingSpeech" @complete="traced" @attempt="traceAttempt" /></div>
    <p v-if="captions && started" class="optional-caption" aria-live="polite">{{ caption }}</p>
    <p v-if="errors" class="lesson-error" role="alert">{{ errors }} <button @click="restart">Restart</button></p>
    <button v-if="phase === 'reward' && finished" class="start-lesson" aria-label="Play the lesson again" @click="restart"><span aria-hidden="true">&#8635;</span></button>
    <ParentGate v-if="gate" @passed="gate = false; parentOpen = true" @close="closeParent" />
    <section v-if="parentOpen" class="parent-settings" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <button class="settings-close" aria-label="Close parent menu" @click="closeParent">&#215;</button>
      <h2 id="settings-title">For parents and teachers</h2>
      <p>Letter names and shapes first. Spoken imitation is encouraged, never assessed. Browser speech is a temporary fallback until reviewed recordings are supplied.</p>
      <label><input v-model="captions" type="checkbox"> Show optional captions</label>
      <label>Narration speed <input v-model.number="rate" type="range" min="0.85" max="1" step="0.05"> {{ rate }}x</label>
      <label>Speech volume <input v-model.number="volume" type="range" min="0" max="1" step="0.05"></label>
      <button @click="setPaused(!paused)">{{ paused ? 'Resume lesson' : 'Pause lesson' }}</button>
      <p>{{ progress.completed.length }} activities completed; recognition accuracy {{ accuracy }}%; {{ progress.traceAttempts }} stroke attempts. Tracing {{ progress.tracingCompleted ? 'completed' : 'in progress' }}. Saved at {{ progress.resume }}.</p>
      <label>Repeat a phase <select aria-label="Choose lesson phase" @change="revisit(($event.target as HTMLSelectElement).value)"><option value="" disabled selected>Choose a phase</option><option v-for="definition in lesson" :key="definition.id" :value="definition.id">{{ definition.id }}</option></select></label>
      <button @click="restart">Restart lesson</button>
      <p class="privacy-note">Future photo avatars require parent consent. No photographs are used or uploaded by this lesson.</p>
    </section>
    <span class="sr-only" aria-live="polite">{{ started ? speech[narration?.current ?? 'hello'] : 'Start the letter A lesson.' }}</span>
  </main>
</template>

<style>
.learning-world { position:relative; isolation:isolate; width:100%; height:100dvh; min-height:320px; overflow:hidden; background:#ffe9c5; font-family:'DM Sans',sans-serif; color:#70441d; }
.classroom-header { position:absolute; z-index:3; top:18px; left:24px; right:24px; display:flex; align-items:center; justify-content:space-between; pointer-events:none; }
.classroom-brand { font:700 21px 'Outfit',sans-serif; display:flex; align-items:center; gap:4px; color:#70441d; }
.classroom-brand > span:first-child { color:#e9a326; font-size:32px; margin-right:4px; }
.classroom-brand > span:last-child { color:#d87729; }
.audio-controls { display:flex; align-items:center; gap:10px; pointer-events:auto; }
.round-control { display:grid; place-items:center; width:52px; height:52px; border:2px solid #fff9ef; background:#fff8e6; border-radius:50%; box-shadow:0 3px #bd8a4933; color:#775025; font-size:26px; }
.round-control svg { width:27px; height:27px; fill:currentColor; }
.speaker-control { width:64px; height:64px; background:#ffd375; }
.round-control:disabled { opacity:.55; }
button:focus-visible, select:focus-visible, input:focus-visible { outline:4px solid #367a9d; outline-offset:4px; }
.start-lesson { position:absolute; z-index:3; bottom:7%; left:50%; transform:translateX(-50%); display:flex; align-items:center; justify-content:center; gap:18px; min-width:165px; min-height:68px; padding:12px 28px; border:4px solid white; border-radius:25px; background:#ef8b3c; box-shadow:0 5px #b76933; color:white; font:700 27px 'Outfit',sans-serif; }
.start-lesson:disabled { opacity:.55; }
.tracing-plane { position:absolute; z-index:2; }
.optional-caption { position:absolute; z-index:2; bottom:12px; left:50%; transform:translateX(-50%); width:max-content; max-width:90%; margin:0; padding:9px 17px; border-radius:14px; background:#fff8e8e8; color:#70441d; font-size:18px; text-align:center; }
.parent-settings { position:absolute; z-index:12; left:50%; top:50%; transform:translate(-50%,-50%); width:min(530px,94%); max-height:88dvh; overflow:auto; padding:27px; background:#fff9eb; border:4px solid white; border-radius:24px; box-shadow:0 0 0 100vmax #61402566; }
.parent-settings h2 { font:700 27px 'Outfit',sans-serif; margin:0 45px 14px 0; }
.parent-settings p { font-size:14px; line-height:1.5; }
.parent-settings label { display:flex; gap:10px; align-items:center; margin:16px 0; flex-wrap:wrap; }
.parent-settings button, .parent-settings select { min-height:48px; padding:9px 14px; border:2px solid #efd1a3; border-radius:12px; background:#fff0d2; }
.parent-settings .settings-close { position:absolute; top:12px; right:12px; font-size:25px; }
.privacy-note { color:#8d704e; }
.lesson-error { position:absolute; z-index:10; top:40%; left:10%; right:10%; padding:24px; background:#fff9eb; border-radius:18px; text-align:center; }
.sr-only { position:absolute; width:1px; height:1px; padding:0; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; }
@media(max-width:650px) { .classroom-header { top:12px; left:12px; right:12px; } .classroom-brand { font-size:16px; gap:2px; } .classroom-brand > span:first-child { font-size:24px; } .audio-controls { gap:6px; } .round-control { width:44px; height:44px; } .speaker-control { width:56px; height:56px; } .optional-caption { font-size:15px; } }
@media(prefers-reduced-motion:reduce) { .learning-world * { scroll-behavior:auto; transition:none !important; animation:none !important; } }
</style>
