<script setup lang="ts">
import { tracingStrokes, evaluateTrace } from '../classroom/tracing'
import { check, abortError, LessonClock } from '../classroom/lessonStateMachine'
import type { SpeechId } from '../classroom/lessonConfig'
import type { Point } from '../domain/types'
const props = defineProps<{ mode: 'demo' | 'trace'; paused: boolean; signal: AbortSignal; speak: (id: SpeechId) => Promise<void> }>()
const emit = defineEmits<{ complete: []; attempt: [correct: boolean] }>()
const surface = ref<SVGSVGElement>()
const stroke = ref(0), guide = ref(0), paths = ref<Point[][]>([]), current = ref<Point[]>([])
const drawing = ref(false), prompting = ref(false), finished = ref(false)
const clock = new LessonClock()
watch(() => props.paused, value => { clock.paused = value }, { immediate: true })
let frame = 0
const activePath = computed(() => tracingStrokes[Math.min(stroke.value, 2)]!)
const dot = computed(() => {
  const [start, end] = activePath.value
  return { x: start!.x + (end!.x - start!.x) * guide.value, y: start!.y + (end!.y - start!.y) * guide.value }
})
const pathData = (points: Point[]) => points.map((point, index) => `${index ? 'L' : 'M'}${point.x * 500},${point.y * 500}`).join(' ')
function position(event: PointerEvent): Point {
  const rect = surface.value!.getBoundingClientRect()
  return { x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height }
}
function down(event: PointerEvent) {
  if (props.mode !== 'trace' || props.paused || prompting.value || finished.value) return
  event.preventDefault(); surface.value!.setPointerCapture(event.pointerId)
  current.value = [position(event)]; drawing.value = true
}
function move(event: PointerEvent) { if (drawing.value && !props.paused) current.value.push(position(event)) }
async function up() {
  if (!drawing.value) return
  drawing.value = false
  if (props.paused) { current.value = []; return }
  const result = evaluateTrace(current.value, stroke.value)
  emit('attempt', result.correct)
  prompting.value = true
  try {
    if (result.correct) {
      paths.value.push([...current.value]); current.value = []; guide.value = 0
      if (stroke.value === 2) { finished.value = true; emit('complete'); return }
      stroke.value++
      await props.speak(stroke.value === 2 ? 'traceAcross' : 'traceDown')
    } else {
      current.value = []
      await props.speak(result.reason === 'start' ? stroke.value === 2 ? 'traceAcross' : 'traceDown' : 'traceRetry')
      await animateStroke(props.signal)
      guide.value = 0
    }
  } catch { /* The phase signal owns cancellation. */ }
  finally { prompting.value = false }
}
function animateStroke(signal: AbortSignal): Promise<void> {
  check(signal)
  return new Promise((resolve, reject) => {
    let elapsed = 0, previous = performance.now()
    const stop = () => { cancelAnimationFrame(frame); signal.removeEventListener('abort', cancel) }
    const cancel = () => { stop(); reject(abortError()) }
    const tick = (now: number) => {
      if (!props.paused) elapsed += Math.min(50, now - previous)
      previous = now; guide.value = Math.min(1, elapsed / 1800)
      if (guide.value === 1) { stop(); resolve() } else frame = requestAnimationFrame(tick)
    }
    signal.addEventListener('abort', cancel, { once: true }); frame = requestAnimationFrame(tick)
  })
}
async function demonstrate() {
  prompting.value = true
  try {
    for (let index = 0; index < 3; index++) {
      stroke.value = index; guide.value = 0
      await props.speak((['downOne', 'downTwo', 'across'] as SpeechId[])[index]!)
      await animateStroke(props.signal)
      paths.value.push([...tracingStrokes[index]!])
      await clock.wait(350, props.signal)
    }
    emit('complete')
  } catch { /* Restart/unmount cancels the demonstration. */ }
  finally { prompting.value = false }
}
async function replayGuide() {
  if (drawing.value || finished.value || prompting.value || props.paused || props.mode !== 'trace') return
  current.value = []; guide.value = 0; prompting.value = true
  try { await props.speak(stroke.value === 2 ? 'traceAcross' : 'traceDown'); await animateStroke(props.signal); guide.value = 0 }
  catch { /* State cancellation also stops the replay. */ }
  finally { prompting.value = false }
}
defineExpose({ replayGuide })
onMounted(() => { if (props.mode === 'demo') void demonstrate() })
onBeforeUnmount(() => cancelAnimationFrame(frame))
</script>

<template>
  <div class="board-tracing">
    <svg ref="surface" class="tracing-surface" viewBox="0 0 500 500" role="img" aria-label="Trace uppercase A: down, down, across" :data-stroke="stroke" :data-ready="!prompting && !paused" @pointerdown="down" @pointermove="move" @pointerup="up" @pointercancel="drawing = false; current = []">
      <path v-for="(path, index) in tracingStrokes" :key="`ghost-${index}`" :d="pathData(path)" class="trace-ghost" />
      <path :d="pathData(activePath)" class="trace-active" />
      <path v-for="(path, index) in paths" :key="index" :d="pathData(path)" class="trace-ink" />
      <path :d="pathData(current)" class="trace-ink" />
      <circle :cx="activePath[1]!.x * 500" :cy="activePath[1]!.y * 500" r="14" fill="#fff7ce" opacity=".7" />
      <circle :cx="dot.x * 500" :cy="dot.y * 500" r="48" fill="#ffe08a" stroke="white" stroke-width="5" />
      <path v-if="mode === 'demo'" :transform="`translate(${dot.x * 500 + 10},${dot.y * 500 + 8})`" d="M0 25 V-6 Q0-17 10-17 Q20-17 20-6 V15 Q46 12 46 30 L40 57 Q17 69 2 53 L-12 34 Q-15 20 0 25" fill="#ffd4ae" stroke="#aa724b" stroke-width="3" />
    </svg>
    <button v-if="mode === 'trace'" class="trace-reset" aria-label="Replay current stroke" :disabled="prompting || paused" @click="replayGuide">&#8634;</button>
  </div>
</template>

<style scoped>
.board-tracing { position:absolute; inset:0; display:grid; place-items:center; }
.tracing-surface { width:100%; height:100%; touch-action:none; user-select:none; overflow:visible; }
path { fill:none; stroke-linecap:round; stroke-linejoin:round; }
.trace-ghost { stroke:#f9f4d4; stroke-width:35; opacity:.18; }
.trace-active { stroke:#fff1bd; stroke-width:30; opacity:.38; }
.trace-ink { stroke:#fff9df; stroke-width:20; }
.trace-reset { position:absolute; right:-55px; bottom:0; width:48px; height:48px; border:2px solid white; background:#ffefd0; color:#74411c; border-radius:50%; font-size:29px; }
@media(max-width:600px) { .trace-reset { right:0; bottom:-55px; } }
</style>
