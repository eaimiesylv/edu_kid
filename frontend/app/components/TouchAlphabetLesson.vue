<script setup lang="ts">
import { alphabet, touchConfig, mastered, arrangeChoices, transitionAllowed, type TouchPhase, type Trial } from '../classroom/touchLesson'
import { LetterAudioManager } from '../classroom/letterAudioManager'
import { cancellableDelay } from '../classroom/lessonStateMachine'
import { shuffled } from '../classroom/lessonConfig'
import type { RecognitionExercise, SceneAction } from '../classroom/lessonConfig'
const stage = ref<{ animate: (action: SceneAction, signal: AbortSignal) => Promise<void> }>()
const phase = ref<TouchPhase>('exploring'), letterIndex = ref(0), choices = ref(['A']), ready = ref(false), busy = ref(false), hinted = ref(false), demonstrating = ref(true)
const finished = ref(false), celebrating = ref(false), progressVersion = ref(0)
const reviewLetter = ref<string>(), selected = ref<string>()
const target = computed(() => reviewLetter.value ?? alphabet[letterIndex.value]!)
const instruction = computed(() => `${phase.value === 'exploring' ? 'Touch' : 'Find'} ${target.value}`)
const exercise = computed<RecognitionExercise | undefined>(() => phase.value === 'exploring' ? undefined : ({ id: 'recognition-touch', choices: choices.value, colors: choices.value.map(() => 0x159be9), layout: 'table' }))
let disposed = false
let audio: LetterAudioManager | undefined, unlocked = false, controller = new AbortController(), reminder: ReturnType<typeof setTimeout> | undefined, demoTimer: ReturnType<typeof setTimeout> | undefined
let taps = 0, round = 0, mistakes = 0, answered = false, trials: Trial[] = [], collected = new Set<string>(), masteredLetters: string[] = []
type InteractionEvidence = { kind: 'exploration' | 'guided' | 'independent'; phase: TouchPhase; target: string; selected: string; correct: boolean; scored: boolean }
let attempts: InteractionEvidence[] = []
const audioMissing = ref(false)
function save() { progressVersion.value++; try { localStorage.setItem('bright-steps-touch-progress', JSON.stringify({ letterIndex: letterIndex.value, mastered: masteredLetters, trials, attempts })) } catch {} }
async function say(text = target.value) {
  if (!unlocked || !audio) return
  try { await audio.play(text, controller.signal) } catch { if (!controller.signal.aborted) audioMissing.value = true }
}
function scheduleReminder() {
  if (disposed || finished.value) return
  clearTimeout(reminder)
  reminder = setTimeout(async () => {
    if (!busy.value && unlocked && !document.hidden) { busy.value = true; await say(); busy.value = false }
    scheduleReminder()
  }, touchConfig.reminderMs)
}
function configure(next: TouchPhase) {
  if (!transitionAllowed(phase.value, next)) throw new Error(`Invalid lesson transition: ${phase.value} to ${next}`)
  phase.value = next; hinted.value = false; answered = false; mistakes = 0; collected.clear()
  const distractors = alphabet.filter(l => l !== target.value)
  if (next === 'exploring') { choices.value = [target.value]; demonstrating.value = true; clearTimeout(demoTimer); demoTimer = setTimeout(() => { demonstrating.value = false }, 1800); return }
  if (next === 'recognition-easy' || next === 'reinforcing') { choices.value = arrangeChoices(target.value, ['car'], 2, round++); demonstrating.value = true; hinted.value = next === 'reinforcing'; return }
  demonstrating.value = next === 'recognition-collection'
  if (next === 'recognition-collection') {
    choices.value = arrangeChoices(`${target.value}:0`, [`${target.value}:1`, `${target.value}:2`, `${target.value}:demo`, distractors[0]!, distractors[1]!], 6, round++)
  } else choices.value = arrangeChoices(target.value, distractors, phase.value === 'assessing' && round % 2 ? 3 : 2, round++)
}
async function animate(action: SceneAction = 'jump') {
  celebrating.value = action === 'celebrate'
  try { await nextTick(); await stage.value?.animate(action, controller.signal) }
  finally { celebrating.value = false }
}
const learningStage = computed(() => phase.value === 'exploring')
const stageProgress = computed(() => {
  progressVersion.value
  if (finished.value) return 100
  if (learningStage.value) return Math.min(100, taps / touchConfig.exploration * 100)
  const steps = phase.value === 'recognition-letters' ? 1 : phase.value === 'recognition-collection' ? 2 + collected.size : phase.value === 'assessing' ? 5 + trials.length : 0
  return Math.min(100, steps / (5 + touchConfig.trials) * 100)
})
function replayA() {
  if (busy.value) return
  controller.abort(); controller = new AbortController()
  masteredLetters = []; answered = false; selected.value = undefined; reviewLetter.value = undefined; finished.value = false; phase.value = 'exploring'; choices.value = ['A']; taps = 0; trials = []; collected.clear(); hinted.value = false; demonstrating.value = true; clearTimeout(demoTimer); demoTimer = setTimeout(() => { demonstrating.value = false }, 1800); save(); scheduleReminder()
}

async function present(next: TouchPhase) {
  configure(next)
  await nextTick()
  await say()
  if (next === 'recognition-easy' || next === 'reinforcing' || next === 'recognition-collection') {
    const example = next === 'recognition-collection' ? `${target.value}:demo` : target.value
    selected.value = example
    await cancellableDelay(400, controller.signal)
    await animate()
    if (next === 'recognition-collection') choices.value = choices.value.filter(id => id !== example)
    demonstrating.value = false
    hinted.value = false
    selected.value = undefined
    await nextTick()
  }
}
async function select(id: string) {
  if (finished.value || !ready.value || busy.value || collected.has(id)) return
  if (!unlocked) { audio?.unlock(); unlocked = true }
  busy.value = true; selected.value = id; demonstrating.value = false; clearTimeout(reminder)
  try {
    const correct = id.split(':')[0] === target.value
    const independent = ['assessing', 'recognition-letters'].includes(phase.value) && !answered && !hinted.value
    attempts.push({ kind: phase.value === 'exploring' ? 'exploration' : independent ? 'independent' : 'guided', phase: phase.value, target: target.value, selected: id, correct, scored: phase.value === 'assessing' && independent })
    attempts = attempts.slice(-200)
    if (phase.value === 'recognition-letters') answered = true
    save()
    if (phase.value === 'exploring') {
      if (!correct) return
      await Promise.all([say(), animate()]); taps++; save()
      if (taps >= touchConfig.exploration) { if (masteredLetters.length) { reviewLetter.value = masteredLetters[(letterIndex.value + masteredLetters.length - 1) % masteredLetters.length]; await present('review') } else await present('recognition-easy') }
    } else {
      if (phase.value === 'assessing' && !answered) {
        trials.push({ correct, assisted: hinted.value, arrangement: choices.value.join(',') }); answered = true; save()
      }
      if (!correct) {
        mistakes++; await say('Oops!')
        if (mistakes >= touchConfig.struggleErrors) {
          if (phase.value === 'assessing') { trials = []; save(); await present('reinforcing') }
          else {
            hinted.value = true
            if (mistakes >= touchConfig.struggleErrors * 2) {
              choices.value = shuffled(choices.value, Math.random)
              mistakes = 0
              await nextTick(); await say()
            }
          }
        }
        return
      }
      if (phase.value === 'recognition-collection') {
        await Promise.all([say(), animate()]); await animate('celebrate'); collected.add(id); choices.value = choices.value.filter(c => c !== id); save()
        if (!choices.value.some(c => c.split(':')[0] === target.value)) { await present('assessing') }
      } else {
        await animate('celebrate')
        if (phase.value === 'review') { reviewLetter.value = undefined; await present('recognition-easy') }
        else if (phase.value === 'recognition-easy' || phase.value === 'reinforcing') await present('recognition-letters')
        else if (phase.value === 'recognition-letters') await present('recognition-collection')
        else if (trials.length >= touchConfig.trials) {
          if (mastered(trials)) {
            masteredLetters = ['A']; finished.value = true; choices.value = []; save()
          } else { trials = []; await present('reinforcing') }
        } else await present('assessing')
      }
    }
  } catch (error) { if (!controller.signal.aborted) throw error } finally { selected.value = undefined; busy.value = false; scheduleReminder() }
}
onMounted(async () => {
  audio = new LetterAudioManager()
  demoTimer = setTimeout(() => { demonstrating.value = false }, 1800)

  await audio.preload(); scheduleReminder()
})
onBeforeUnmount(() => { disposed = true; clearTimeout(reminder); clearTimeout(demoTimer); controller.abort(); audio?.dispose() })
</script>
<template>
  <main class="touch-classroom" :data-phase="phase" :data-busy="busy" :data-complete="finished">
    <header class="game-header">
      <label class="letter-picker">Learn a letter
        <select aria-label="Select a letter to learn" :disabled="busy" value="A">
          <option v-for="letter in alphabet" :key="letter" :value="letter" :disabled="letter !== 'A'">{{ letter }}{{ letter !== 'A' ? ' - Coming soon' : '' }}</option>
        </select>
      </label>
      <p class="touch-instruction">{{ finished ? 'You found A!' : instruction }}</p>
      <div class="level-indicator">
        <div class="stage-labels"><span :class="{ active: learningStage }">1. Learn</span><span :class="{ active: !learningStage }">2. Recognise</span></div>
        <div class="level-track" role="progressbar" :aria-label="learningStage ? 'Learning stage progress' : 'Recognition stage progress'" :aria-valuenow="Math.round(stageProgress)" aria-valuemin="0" aria-valuemax="100"><span :style="{ width: `${stageProgress}%` }"/></div>
      </div>
    </header>
    <section class="classroom-card" aria-label="Letter game">
      <ThreeLearningStage ref="stage" hide-characters :phase="phase === 'exploring' ? 'exploring' : 'recognition-touch'" :choices="choices" :exercise="exercise" :enabled="ready && !busy && !finished" :hinted="hinted" :paused="false" :target="target" :selected="selected" :demonstrating="demonstrating" @ready="ready = true" @select="select" />
      <div v-if="celebrating" class="correct-reward" role="status" aria-label="Correct letter"><span aria-hidden="true">&#9733; &#10003; &#9733;</span></div>
      <div v-if="finished" class="completion-card"><span class="completion-star" aria-hidden="true">&#9733;</span><h1>Amazing A!</h1><p>Learning and recognition complete</p><button @click="replayA">Play A again</button></div>
    </section>
    <p v-if="audioMissing" class="voice-note" role="status">Letter audio is unavailable on this browser.</p>
  </main>
</template>
<style scoped>
.touch-classroom { position:relative; height:100dvh; min-height:420px; overflow:hidden; background:#f6f8ed; color:#294942; font-family:'DM Sans',sans-serif; }
.game-header { position:absolute; inset:22px 28px auto; display:grid; grid-template-columns:160px 1fr 230px; gap:24px; align-items:center; }
.letter-picker { margin:0; display:grid; gap:7px; font-size:12px; font-weight:700; color:#59736b; }
.letter-picker select { margin:0; width:100%; min-height:48px; padding:8px 14px; font:700 20px 'DM Sans',sans-serif; color:#294942; border:2px solid #dae6d9; border-radius:16px; background:#fffdf5; cursor:pointer; }
.touch-instruction { justify-self:center; margin:0; font:700 30px 'Outfit',sans-serif; color:#294942; }
.stage-labels { display:flex; justify-content:space-between; gap:12px; margin-bottom:10px; font-size:13px; color:#83958a; font-weight:600; }
.stage-labels .active { color:#326e55; }
.level-track { height:10px; border-radius:20px; background:#e0e9db; overflow:hidden; }
.level-track > span { display:block; height:100%; border-radius:20px; background:#67ab7b; transition:width .4s ease; }
.classroom-card { position:absolute; inset:110px 24px 24px; border:4px solid #fffdf5; border-radius:32px; overflow:hidden; box-shadow:0 8px 30px #365b4410; }
.correct-reward { position:absolute; top:12%; left:50%; transform:translateX(-50%); padding:12px 24px; color:#438159; background:#fffdf5; border-radius:24px; font-size:38px; pointer-events:none; animation:reward 1.5s ease both; }
@keyframes reward { 0%,100% { opacity:0; transform:translate(-50%,10px) scale(.92); } 25%,75% { opacity:1; transform:translate(-50%,0) scale(1); } }
.completion-card { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:16px; background:#f7f8edef; text-align:center; padding:24px; }
.completion-star { color:#deb44e; font-size:80px; }.completion-card h1 { margin:0; font:700 42px 'Outfit',sans-serif; }.completion-card p { margin:0; color:#59736b; }
.completion-card button { margin-top:12px; padding:14px 28px; min-height:52px; border:0; border-radius:18px; background:#438159; color:white; font:700 18px 'DM Sans',sans-serif; cursor:pointer; }
select:focus-visible, button:focus-visible { outline:3px solid #438159; outline-offset:4px; }
.voice-note { position:absolute; bottom:4px; left:10%; right:10%; text-align:center; font-size:12px; color:#543b25; }
@media(max-width:650px) { .game-header { inset:14px 18px auto; grid-template-columns:112px 1fr; gap:14px 20px; }.touch-instruction { font-size:26px; }.level-indicator { grid-column:1 / -1; }.classroom-card { inset:152px 10px 12px; border-radius:24px; }.stage-labels { margin-bottom:6px; } }
@media(max-height:550px) and (min-width:651px) { .game-header { top:10px; }.classroom-card { top:92px; bottom:10px; } }
@media(prefers-reduced-motion:reduce) { .correct-reward { animation:none; }.level-track > span { transition:none; } }
</style>
