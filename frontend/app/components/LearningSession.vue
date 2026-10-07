<script setup lang="ts">
import { conceptById } from '../domain/curriculum'
import { lessonSteps } from '../domain/lesson'
import type { Evidence } from '../domain/types'
const emit = defineEmits<{ home: []; parent: [] }>()
const learning = useLearning()
const session = computed(() => learning.snapshot.value?.session)
const activity = computed(() => session.value?.activity)
const concept = computed(() => activity.value ? conceptById(activity.value.conceptId) : null)
const complete = ref(false), processing = ref(false), heard = ref(false)
const celebrating = ref(false)
let celebrationTimer: ReturnType<typeof setTimeout> | undefined
const index = computed(() => session.value?.lessonIndex ?? 0)
const step = computed(() => lessonSteps[index.value]!)
const completed = computed(() => session.value?.completedIds ?? [])
const stepTitle = computed(() => `${step.value.title}${['see', 'hear', 'recognise'].includes(step.value.kind) ? ' ' + concept.value?.value : ''}`)
const { speak, available } = useNarration()
const prompt = computed(() => concept.value?.narration[activity.value?.kind ?? 'see'] ?? '')
watch(() => activity.value?.id, () => {
  complete.value = !!activity.value && completed.value.includes(activity.value.id); heard.value = false
  celebrating.value = false; clearTimeout(celebrationTimer)
  if (prompt.value) speak(prompt.value)
}, { immediate: true })
onMounted(() => { if (prompt.value) speak(prompt.value) })
function narrate() { heard.value = true; speak(prompt.value) }
function celebrate() {
  celebrating.value = true; clearTimeout(celebrationTimer)
  celebrationTimer = setTimeout(() => { celebrating.value = false }, 1600)
}
onBeforeUnmount(() => clearTimeout(celebrationTimer))
async function record(result: Partial<Evidence>) {
  if (processing.value || complete.value) return
  processing.value = true
  try {
    await learning.record(result)
    complete.value = !result.interactionFailure && result.correct === true
    if (result.correct && !result.interactionFailure) celebrate()
  } finally { processing.value = false }
}
async function next() {
  if (!activity.value || processing.value) return
  if (!complete.value && ['see', 'watch'].includes(activity.value.kind)) await record({ correct: true, assistanceLevel: activity.value.assistance })
  if (!complete.value && activity.value.kind === 'hear' && heard.value) await record({ correct: true, assistanceLevel: activity.value.assistance })
  await learning.advance()
}
async function move(position: number) { if (!processing.value) await learning.move(position) }
</script>
<template>
  <main class="session-page" :class="{ 'game-session': activity && ['recognise', 'review'].includes(activity.kind) }"><template v-if="activity && concept">
    <div class="session-top"><button class="text-button" @click="emit('home')">← Take a break</button>
      <span class="star-count">★ {{ session?.stars }} stars</span></div>
    <div class="activity-heading"><span class="eyebrow">{{ activity.isRevision ? 'MIXED REVIEW' : 'LET’S LEARN TOGETHER' }}</span>
      <p class="lesson-title">{{ stepTitle }} <small>({{ step.subtitle }})</small></p>
      <h2>{{ prompt }}</h2><button class="audio-button" aria-label="Hear instruction" @click="narrate">♫</button>
      <p v-if="!available" class="muted">Your browser needs speech support for spoken instructions. A grown-up can read along.</p></div>
    <LessonControls :index="index" :busy="processing" :last="index === lessonSteps.length - 1" @previous="move(index - 1)" @next="next">
    <div v-if="['see', 'hear'].includes(activity.kind)" class="concept-intro"><span>{{ concept.value }}</span><Mascot/></div>
    <WritingActivity v-else-if="['watch', 'guided', 'trace', 'write'].includes(activity.kind)" :key="activity.id" :activity="activity" :concept="concept" @result="record"/>
    <RecognitionActivity v-else :key="activity.id" :activity="activity" :concept="concept" @result="record"/>
    </LessonControls>
    <button v-if="activity.kind === 'hear' && !heard" class="text-button" @click="narrate">♫ Hear it again</button>
    <div class="narrator-bubble"><Mascot/><span>{{ prompt }}</span></div>
    <p v-if="complete" class="completed-step-note">✓ This step is saved. You can practise again without adding duplicate progress.</p>
    <LessonNavigation :index="index" :completed="completed" :ids="session?.lessonActivities?.map(row => row.id) ?? []" :busy="processing" @move="move"/>
    <SuccessSplash v-if="celebrating" :letter="concept.value"/>
  </template><section v-else class="celebration illustrated-world"><span class="celebration-avatar" aria-hidden="true">👧🏾</span><h1>Great Job!</h1>
    <p>You earned {{ session?.stars }} stars!</p><div class="reward-stars">★ ★ ★</div>
    <button class="button primary" @click="emit('home')">Continue →</button>
    <button class="button secondary" @click="move(12)">← Previous step</button>
    <button class="text-button" @click="emit('parent')">View progress (parent)</button></section></main>
</template>
