<script setup lang="ts">
import { createRecognitionGame } from '../games/recognition'
import type { Activity, Concept, Evidence } from '../domain/types'
const props = defineProps<{ activity: Activity; concept: Concept }>()
const emit = defineEmits<{ result: [result: Partial<Evidence>] }>()
const host = ref<HTMLElement>(), message = ref(''), guesses = ref(0), hints = ref(0), completed = ref(false)
const paused = ref(false)
let disposed = false
const { speak } = useNarration()
let game: Awaited<ReturnType<typeof createRecognitionGame>> | undefined
let hintTimer: ReturnType<typeof setTimeout> | undefined
let started = Date.now()
function hint() {
  if (paused.value || completed.value) return
  hints.value++
  game?.highlight(props.concept.value)
  speak(`This is ${props.concept.value}. Touch ${props.concept.value}.`)
}
function choose(value: string) {
  if (completed.value || paused.value) return
  const correct = value === props.concept.value
  emit('result', { correct, firstAttempt: guesses.value === 0, hintsUsed: hints.value,
    assistanceLevel: hints.value ? Math.max(3, props.activity.assistance) : props.activity.assistance,
    responseTimeMs: Date.now() - started })
  guesses.value++
  if (correct) { completed.value = true; message.value = 'You found it!'; speak('You found it!') }
  else { message.value = 'Let’s look together.'; speak(`Let's look together. Find ${props.concept.value}.`); hint() }
  if (guesses.value >= 3 && !correct) { completed.value = true; message.value = 'Let’s practise together.' }
}
function togglePause() { paused.value = !paused.value; game?.pause(paused.value) }
onMounted(async () => {
  started = Date.now()
  game = await createRecognitionGame(host.value!, props.activity, { choose })
  if (disposed) { game.game.destroy(true); return }
  if (props.activity.assistance >= 3) hint()
  if (props.activity.assistance === 2) hintTimer = setTimeout(hint, 6000)
})
onBeforeUnmount(() => { disposed = true; clearTimeout(hintTimer); game?.game.destroy(true) })
</script>
<template>
  <div class="recognition" :class="{ 'mixed-review': activity.kind === 'review' }"><button class="game-pause button secondary" @click="togglePause">{{ paused ? '▶ Resume game' : 'Ⅱ Pause game' }}</button><div ref="host" class="game-host" aria-hidden="true"/>
    <p v-if="paused" role="status">Game paused. Ready when you are.</p>
    <div class="accessible-options" aria-label="Letter choices"><button v-for="value in activity.options" :key="value" :disabled="completed || paused" @click="choose(value)">{{ value }}</button></div>
    <p class="activity-message" aria-live="polite">{{ message || 'Listen, look, and tap.' }}</p>
    <button v-if="!completed" class="button secondary" @click="hint">☀ A little help</button>
  </div>
</template>
