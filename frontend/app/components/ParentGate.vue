<script setup lang="ts">
const emit = defineEmits<{ passed: []; close: [] }>()
const first = Math.floor(Math.random() * 5) + 4
const second = Math.floor(Math.random() * 5) + 3
const answer = ref('')
const error = ref(false)
function verify() {
  if (Number(answer.value) === first + second) emit('passed')
  else { error.value = true; answer.value = '' }
}
</script>
<template>
  <div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="gate-title">
    <button class="close-button" aria-label="Close" @click="emit('close')">×</button>
    <span class="eyebrow">FOR GROWN-UPS</span><h2 id="gate-title">A little parent check</h2>
    <p>To open the parent area, solve this question.</p>
    <form @submit.prevent="verify"><label :for="'gate-answer'">{{ first }} + {{ second }} = ?</label>
      <input id="gate-answer" v-model="answer" type="number" inputmode="numeric" autofocus required>
      <p v-if="error" role="alert">Try that once more.</p><button class="button primary">Continue</button>
    </form>
  </section></div>
</template>
