<script setup lang="ts">
import { evaluateWriting, samplePaths } from '../domain/writing'
import { renderWriting } from '../services/canvas'
import type { Activity, Concept, Evidence, Point } from '../domain/types'
const props = defineProps<{ activity: Activity; concept: Concept }>()
const emit = defineEmits<{ result: [result: Partial<Evidence>] }>()
const canvas = ref<HTMLCanvasElement>(), drawn = ref<Point[][]>([]), drawing = ref(false)
const submitted = ref(false), message = ref(''), reference = ref(false)
const attempts = ref(0), paused = ref(false)
const usedReference = ref(false)
let frame = 0, began = Date.now(), animationStart = 0
const guided = computed(() => props.activity.kind !== 'write')
function paint(dot?: Point) { if (canvas.value) renderWriting(canvas.value, props.concept.strokes, drawn.value, guided.value, dot, props.activity.kind) }
function position(event: PointerEvent): Point {
  const rect = canvas.value!.getBoundingClientRect()
  return { x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height }
}
function pointerDown(event: PointerEvent) {
  if (submitted.value || props.activity.kind === 'watch') return
  canvas.value!.setPointerCapture(event.pointerId)
  drawing.value = true; drawn.value.push([position(event)]); paint()
}
function pointerMove(event: PointerEvent) {
  if (!drawing.value) return
  drawn.value[drawn.value.length - 1]!.push(position(event)); paint()
}
function clear() { drawn.value = []; submitted.value = false; message.value = ''; paint() }
function submit() {
  const result = evaluateWriting(drawn.value, props.concept.strokes)
  message.value = result.interactionFailure ? 'Make a mark on the board. Let’s try together.' : result.correct ? 'Lovely work! You made it.' : 'A lovely try. We’ll practise a little more.'
  if (result.correct) submitted.value = true
  emit('result', { correct: result.correct, interactionFailure: result.interactionFailure,
    assistanceLevel: props.activity.kind === 'write' && usedReference.value ? 1 : props.activity.assistance,
    firstAttempt: attempts.value++ === 0, responseTimeMs: Date.now() - began })
}
function toggleReference() { reference.value = !reference.value; usedReference.value ||= reference.value }
function replay() { cancelAnimationFrame(frame); animationStart = 0; paused.value = false; frame = requestAnimationFrame(animate) }
function togglePause() {
  paused.value = !paused.value
  if (paused.value) cancelAnimationFrame(frame)
  else frame = requestAnimationFrame(animate)
}
function animate(time: number) {
  animationStart ||= time
  const points = samplePaths(props.concept.strokes)
  const index = Math.floor(((time - animationStart) % 6000) / 6000 * points.length)
  if (props.activity.kind === 'watch') {
    let remaining = index
    drawn.value = props.concept.strokes.map(path => {
      const samples = samplePaths([path]), shown = samples.slice(0, Math.max(0, remaining))
      remaining -= samples.length
      return shown
    })
  }
  paint(points[index]); frame = requestAnimationFrame(animate)
}
onMounted(() => {
  paint()
  if (['watch', 'guided'].includes(props.activity.kind)) frame = requestAnimationFrame(animate)
})
onBeforeUnmount(() => cancelAnimationFrame(frame))
</script>
<template>
  <div class="writing"><div v-if="activity.kind === 'write'" class="writing-reference">
    <span v-if="reference">{{ concept.value }}</span><button class="text-button" @click="toggleReference">{{ reference ? 'Hide example' : 'Show example' }}</button>
  </div>
    <div v-if="activity.kind === 'watch'" class="stroke-legend"><span v-for="(_, strokeIndex) in concept.strokes" :key="strokeIndex">{{ strokeIndex + 1 }}<small>Stroke {{ strokeIndex + 1 }}</small></span></div>
    <canvas ref="canvas" width="420" height="420" aria-label="Writing board" class="writing-canvas"
      @pointerdown="pointerDown" @pointermove="pointerMove" @pointerup="drawing = false" @pointercancel="drawing = false"/>
    <div v-if="['watch', 'guided'].includes(activity.kind)" class="writing-buttons"><button class="button secondary" @click="replay">↻ Replay strokes</button><button class="button secondary" @click="togglePause">{{ paused ? 'Play animation' : 'Pause animation' }}</button></div>
    <template v-if="activity.kind !== 'watch'"><div class="writing-buttons"><button class="button secondary" @click="clear">↺ Try again</button>
      <button class="button primary" :disabled="submitted" @click="submit">✓ I’m done</button></div><p class="activity-message" aria-live="polite">{{ message }}</p></template>
  </div>
</template>
