<script setup lang="ts">
defineProps<{ index: number; busy: boolean; last: boolean }>()
const emit = defineEmits<{ previous: []; next: [] }>()
</script>
<template>
  <div class="learning-environment"><button class="lesson-arrow previous" aria-label="Previous step" :disabled="index === 0 || busy" @click="emit('previous')">←</button>
    <div class="learning-stage"><slot/></div>
    <button class="lesson-arrow next" :aria-label="last ? 'Finish session' : 'Next step'" :disabled="busy" @click="emit('next')">→</button>
  </div>
</template>
