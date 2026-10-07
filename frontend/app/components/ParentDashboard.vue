<script setup lang="ts">
import { conceptById, skills, skillLabel } from '../domain/curriculum'
import { saveSnapshot } from '../services/storage'
const emit = defineEmits<{ configure: []; home: [] }>()
const learning = useLearning(), api = useApi()
const selected = ref(learning.snapshot.value?.config.currentConceptId ?? 'letter-a')
const error = ref('')
const { token } = api
const state = computed(() => learning.snapshot.value!)
const records = computed(() => state.value.model[selected.value] ?? {})
const weakest = computed(() => skills.filter(skill => records.value[skill]).sort((a, b) => (records.value[a]?.score ?? 0) - (records.value[b]?.score ?? 0))[0])
function conceptStatus(id: string) {
  const rows = Object.values(state.value.model[id] ?? {})
  if (!rows.length) return 'Not started'
  return conceptById(id).capabilities.every(skill => state.value.model[id]?.[skill]?.state === 'mastered') ? 'Mastered' : 'Learning'
}
async function override() {
  error.value = ''
  try {
    const config = { ...state.value.config, currentConceptId: selected.value }
    await api.request(`/children/${state.value.child.id}/config`, { method: 'PUT', body: config })
    state.value.config = config; state.value.session = null
    await saveSnapshot(state.value)
  } catch { error.value = 'Could not change the current letter. Sign in and try again.' }
}
function moveConcept(direction: number) {
  const ids = state.value.config.conceptIds
  selected.value = ids[(ids.indexOf(selected.value) + direction + ids.length) % ids.length]!
}
</script>
<template>
  <main class="dashboard"><div class="dashboard-heading"><div><span class="eyebrow">PROGRESS · PARENT VIEW</span><h1>👧🏾 {{ state.child.name }} – Letters</h1><p>A picture of understanding, one skill at a time.</p></div>
    <button class="button secondary" @click="emit('home')">Back to adventure →</button></div>
    <div class="concept-progress"><button v-for="id in state.config.conceptIds" :key="id" :class="{ active: selected === id, untouched: conceptStatus(id) === 'Not started' }" @click="selected = id"><span>{{ conceptById(id).value }}</span><small>{{ conceptStatus(id) }}</small></button></div>
    <div class="concept-step-controls"><button class="back-circle" aria-label="Previous letter progress" @click="moveConcept(-1)">←</button><span>Viewing {{ conceptById(selected).value }}</span><button class="back-circle" aria-label="Next letter progress" @click="moveConcept(1)">→</button></div>
    <div class="dashboard-grid"><section class="panel"><span class="eyebrow">LEARNING NOW</span><h2>Meet {{ conceptById(state.config.currentConceptId).value }}</h2>
      <p>Learning range: {{ state.config.conceptIds.map(id => conceptById(id).value).join(', ') }}</p>
      <label>View or switch concept<select v-model="selected"><option v-for="id in state.config.conceptIds" :key="id" :value="id">{{ conceptById(id).value }}</option></select></label>
      <button class="button secondary" @click="override">Learn this letter next</button><p class="muted">Earlier progress stays saved when you switch.</p>
      <p v-if="error" role="alert" class="error">{{ error }}</p><button class="text-button" @click="emit('configure')">{{ token ? 'Change profile or learning range →' : 'Sign in to manage this profile →' }}</button></section>
      <section class="panel metrics-panel"><h2>Learning Metrics · {{ conceptById(selected).value }}</h2>
        <div v-for="skill in skills" :key="skill" class="skill-row"><div><strong>{{ skillLabel(skill) }}</strong><span>{{ records[skill] ? Math.round(records[skill]!.score * 100) + '%' : 'Not yet explored' }}</span></div>
          <div class="skill-track"><i :style="{ width: `${(records[skill]?.score ?? 0) * 100}%` }"/></div>
          <small v-if="records[skill]">{{ records[skill]!.independentSuccesses }} independent successes · {{ records[skill]!.state }}</small></div>
        <p v-if="weakest" class="practice-note">A little more practice: <strong>{{ skillLabel(weakest) }}</strong></p>
        <p v-else class="muted">Their first discoveries will appear here.</p></section></div>
    <p class="muted">{{ learning.syncMessage.value }} · Scores reflect practice evidence and are not a clinical or educational assessment.</p>
  </main>
</template>
