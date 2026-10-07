<script setup lang="ts">
defineProps<{ letter: string }>()
</script>
<template>
  <div class="success-splash" role="status" aria-live="polite"><div class="success-burst">
    <span v-for="n in 14" :key="n" class="confetti-star" :style="{ '--i': n }" aria-hidden="true">★</span>
    <Mascot/><strong>Great job!</strong><span>You did it! {{ letter }} ★</span>
  </div></div>
</template>
