<script setup lang="ts">
import { lessonSteps } from '../domain/lesson'
defineProps<{ index: number; completed: string[]; ids: string[]; busy: boolean }>()
const emit = defineEmits<{ move: [index: number] }>()
</script>
<template>
  <nav class="lesson-navigation" aria-label="Learning steps"><div class="lesson-step-list">
    <button v-for="(step, position) in lessonSteps" :key="position" :aria-current="position === index ? 'step' : undefined"
      :aria-label="`${position + 1}. ${step.title}: ${step.subtitle}`" :disabled="busy" @click="emit('move', position)">
      <span>{{ completed.includes(ids[position] ?? '') ? '✓' : position + 1 }}</span><small>{{ step.subtitle }}</small></button>
  </div><p class="lesson-position">Step {{ index + 1 }} of {{ lessonSteps.length }}</p>
  <p class="navigation-note">You can explore any step. Stars and progress are earned by completing an activity.</p></nav>
</template>
