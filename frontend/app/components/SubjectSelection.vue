<script setup lang="ts">
const props = defineProps<{ name: string }>()
const emit = defineEmits<{ continue: []; back: [] }>()
const subjects = [
  { name: 'Letters', icon: 'A\nBC', description: 'Learn letters and their sounds', color: 'pink', available: true },
  { name: 'Numbers', icon: '1\n23', description: 'Learn numbers and counting', color: 'cyan', available: false },
  { name: 'Shapes', icon: '▲', description: 'Learn shapes and drawing', color: 'purple', available: false },
  { name: 'Colours', icon: '●', description: 'Learn colours and their names', color: 'orange', available: false },
  { name: 'My Body', icon: '✦', description: 'Learn body parts and names', color: 'green', available: false },
]
</script>
<template>
  <section class="setup-form subject-screen">
    <button class="back-circle" aria-label="Back to child profile" @click="emit('back')">←</button>
    <h2>What should {{ props.name }} learn?</h2><p>Choose one subject to learn first.<br>You can change this later.</p>
    <fieldset class="subject-list"><legend class="sr-only">Choose what to learn</legend>
      <label v-for="subject in subjects" :key="subject.name" class="subject-option" :class="{ unavailable: !subject.available }">
        <input type="radio" name="subject" :value="subject.name" :checked="subject.available" :disabled="!subject.available">
        <span class="subject-tile" :class="subject.color">{{ subject.icon }}</span>
        <span class="subject-description"><strong>{{ subject.name }}</strong><small>{{ subject.description }}</small>
          <small v-if="!subject.available" class="coming-soon">Coming soon</small></span><span class="subject-check">{{ subject.available ? '✓' : '○' }}</span>
      </label>
    </fieldset><button class="button primary" @click="emit('continue')">Continue →</button>
  </section>
</template>
