<script setup lang="ts">
import type { Child, LearningConfig } from './domain/types'
import { saveSnapshot } from './services/storage'
const learning = useLearning(), api = useApi()
const page = ref<'home' | 'account' | 'setup' | 'subject' | 'range' | 'learn' | 'parent'>('home')
const accountMode = ref('register'), setupChild = ref<Child | null>(null)
const gate = ref(false), loading = ref(true), storageError = ref('')
async function start() { await learning.start(); page.value = 'learn' }
function setup() { accountMode.value = 'register'; page.value = api.token.value ? 'setup' : 'account' }
function signin() { accountMode.value = 'login'; page.value = 'account' }
function childCreated(child: Child) { setupChild.value = child; page.value = 'subject' }
async function fresh() {
  if (learning.snapshot.value) learning.snapshot.value.session = null
  await start()
}
async function authenticated() {
  const children = await api.request<Child[]>('/children')
  if (!children.length) { learning.snapshot.value = null; page.value = 'setup'; return }
  const report = await api.request<{ child: Child; config: LearningConfig | null; model: import('./domain/types').LearningModel | [] }>(`/children/${children[0]!.id}/report`)
  if (!report.config) { learning.snapshot.value = null; page.value = 'setup'; return }
  if (learning.snapshot.value?.child.id !== report.child.id) {
    learning.snapshot.value = { child: report.child, config: report.config, model: Array.isArray(report.model) ? {} : report.model, session: null }
    await saveSnapshot(learning.snapshot.value)
  }
  page.value = 'home'
}
function parent() { gate.value = true }
function enterParent() { gate.value = false; page.value = learning.snapshot.value ? 'parent' : api.token.value ? 'setup' : 'account' }
async function configured(child: Child, config: LearningConfig) {
  await learning.configure(child, config)
  page.value = 'home'
}
onMounted(async () => {
  try { await learning.restore(); void learning.sync() }
  catch { storageError.value = 'Please allow browser storage to save learning on this device.' }
  finally { loading.value = false }
  window.addEventListener('online', learning.sync)
})
onBeforeUnmount(() => window.removeEventListener('online', learning.sync))
</script>
<template>
  <div class="app-shell"><header class="site-header"><button class="brand" aria-label="Bright Steps home" @click="page = 'home'"><span class="brand-bird">🐦</span><span>Bright<span class="brand-light">Steps</span><small>LEARN · PLAY · GROW</small></span></button>
    <nav><button class="parent-button" @click="parent">♙ Parent corner</button></nav></header>
    <p v-if="storageError" class="error" role="alert">{{ storageError }}</p>
    <WelcomeScreen v-if="page === 'home'" :snapshot="learning.snapshot.value" :loading="loading" @start="start" @fresh="fresh" @setup="setup" @signin="signin"/>
    <section v-else-if="['account', 'setup', 'subject', 'range'].includes(page)" class="setup-page"><button class="back-circle" aria-label="Back home" @click="page = 'home'">←</button>
      <AccountForm v-if="page === 'account'" :initial-mode="accountMode" @authenticated="authenticated"/>
      <ProfileSetup v-else-if="page === 'setup'" @created="childCreated"/>
      <SubjectSelection v-else-if="page === 'subject'" :name="setupChild?.name ?? 'your child'" @continue="page = 'range'" @back="page = 'setup'"/>
      <LetterRangeSetup v-else-if="setupChild" :child="setupChild" @configured="configured" @back="page = 'subject'"/></section>
    <LearningSession v-else-if="page === 'learn'" @home="page = 'home'" @parent="parent"/>
    <ParentDashboard v-else-if="learning.snapshot.value" @home="page = 'home'" @configure="setup"/>
    <footer class="site-footer"><span>Little steps. Big discoveries.</span><span>Learn · Play · Grow ★</span></footer>
    <ParentGate v-if="gate" @close="gate = false" @passed="enterParent"/>
  </div>
</template>
