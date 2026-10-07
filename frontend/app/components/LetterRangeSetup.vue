<script setup lang="ts">
import { curriculum } from '../domain/curriculum'
import type { Child, LearningConfig } from '../domain/types'
const props = defineProps<{ child: Child }>()
const emit = defineEmits<{ configured: [child: Child, config: LearningConfig]; back: [] }>()
const api = useApi()
const from = ref('letter-a'), to = ref('letter-c'), error = ref(''), busy = ref(false)
const letters = computed(() => curriculum.slice(curriculum.findIndex(item => item.id === from.value), curriculum.findIndex(item => item.id === to.value) + 1))
async function submit() {
  if (!letters.value.length) { error.value = 'Choose an end letter after the start letter.'; return }
  busy.value = true; error.value = ''
  try {
    const config: LearningConfig = { subject: 'english', conceptIds: letters.value.map(item => item.id), currentConceptId: from.value }
    await api.request(`/children/${props.child.id}/config`, { method: 'PUT', body: config })
    emit('configured', props.child, config)
  } catch (exception: any) { error.value = exception.data?.message ?? 'Could not save the learning range. Please try again.' }
  finally { busy.value = false }
}
</script>
<template>
  <form class="setup-form range-screen" @submit.prevent="submit">
    <button type="button" class="back-circle" aria-label="Back to subjects" @click="emit('back')">←</button>
    <header class="range-heading"><span class="subject-tile pink">A<br>BC</span><div><h2>Letters Setup</h2><p>Choose the range for {{ child.name }} to learn.</p></div></header>
    <section class="range-panel"><h3>Letter range</h3><div class="range-fields">
      <label>From<select v-model="from"><option v-for="item in curriculum" :key="item.id" :value="item.id">{{ item.value }}</option></select></label>
      <label>To<select v-model="to"><option v-for="item in curriculum" :key="item.id" :value="item.id">{{ item.value }}</option></select></label></div>
      <p>Letters to be learned: <strong>{{ letters.map(item => item.value).join(', ') }}</strong></p>
      <p class="info-note">ⓘ You can change this later in settings.</p></section>
    <p v-if="error" class="error" role="alert">{{ error }}</p><button class="button primary" :disabled="busy">{{ busy ? 'Saving…' : 'Save and Continue →' }}</button>
  </form>
</template>
