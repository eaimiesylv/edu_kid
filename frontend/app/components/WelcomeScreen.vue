<script setup lang="ts">
import { conceptById } from '../domain/curriculum'
import type { Snapshot } from '../domain/types'
const props = defineProps<{ snapshot: Snapshot | null; loading: boolean }>()
const emit = defineEmits<{ start: []; fresh: []; setup: []; signin: [] }>()
const current = computed(() => props.snapshot ? conceptById(props.snapshot.config.currentConceptId).value : 'A')
</script>
<template>
  <main class="welcome-layout illustrated-world" :class="{ 'returning-welcome': snapshot }">
    <div class="welcome-cloud cloud-one"/><div class="welcome-cloud cloud-two"/>
    <section class="welcome-content"><template v-if="!snapshot"><div class="story-logo" aria-label="Bright Steps"><span class="logo-star">★</span><span>Bright</span><strong>Steps</strong></div>
      <h1 class="welcome-tagline">Learn · Play · Grow</h1><Mascot/>
      <button class="button primary welcome-start" :disabled="loading" @click="emit('setup')">Get Started →</button>
      <p class="signin-note">Already have an account? <button class="text-button" @click="emit('signin')">Sign in</button></p>
    </template><template v-else><div class="returning-avatar" aria-hidden="true">👧🏾</div><h1>Ready to learn, {{ snapshot.child.name }}?</h1>
      <button class="continue-card" :disabled="loading" @click="emit('start')"><span class="play-symbol">▶</span><span><strong>Continue →</strong><small>Continue learning {{ current }}</small></span></button>
      <button class="new-session-card" @click="emit('fresh')"><span class="plus-symbol">+</span><span><strong>Start a new session</strong><small>Begin from the selected range<br>({{ snapshot.config.conceptIds.map(id => conceptById(id).value).join('–') }})</small></span></button>
      <p class="info-note">ⓘ We’re in Structured Mode.<br>The app adapts to {{ snapshot.child.name }}’s progress.</p>
    </template></section>
    <aside class="welcome-sidebar"><span class="subject-tile pink">A<br>BC</span><h2>Little steps.<br>Big discoveries.</h2><p>See it. Hear it. Try it.<br>A helping hand at every step.</p>
      <div class="preview-letters"><span>A</span><span>B</span><span>C</span></div><p class="session-duration">◷ Short adventures for ages 3–7</p></aside>
  </main>
</template>
