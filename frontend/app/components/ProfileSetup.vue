<script setup lang="ts">
import type { Child } from '../domain/types'
const emit = defineEmits<{ created: [child: Child] }>()
const api = useApi()
const name = ref(''), age = ref(4), avatar = ref(0), loading = ref(false), error = ref('')
const children = ref<Child[]>([]), selected = ref('')
const characters = ['👧🏾', '👦🏽', '👧🏽', '👦🏿']
onMounted(async () => {
  try { children.value = await api.request<Child[]>('/children') }
  catch { error.value = 'Sign in to load your family profiles.' }
})
async function submit() {
  loading.value = true; error.value = ''
  try {
    const child = children.value.find(row => row.id === selected.value)
      ?? await api.request<Child>('/children', { method: 'POST', body: { name: name.value, age: age.value } })
    localStorage.setItem(`bright-steps-avatar-${child.id}`, String(avatar.value))
    emit('created', child)
  } catch (exception: any) { error.value = exception.data?.message ?? 'Could not save the profile.' }
  finally { loading.value = false }
}
</script>
<template>
  <form class="setup-form profile-screen" @submit.prevent="submit"><h2>Who’s learning?</h2>
    <div class="profile-portrait" aria-hidden="true">{{ characters[avatar] }}</div>
    <label v-if="children.length">Child profile<select v-model="selected"><option value="">Create a new profile</option><option v-for="child in children" :key="child.id" :value="child.id">{{ child.name }}</option></select></label>
    <template v-if="!selected"><label>Child's first name<input v-model="name" placeholder="Child's name" maxlength="80" required></label>
      <fieldset class="age-picker"><legend>Age</legend><button v-for="value in [3, 4, 5, 6, 7]" :key="value" type="button" :aria-pressed="age === value" :class="{ selected: age === value }" @click="age = value">{{ value }}</button></fieldset>
    </template><fieldset class="avatar-picker"><legend>Choose a character</legend>
      <button v-for="(character, index) in characters" :key="index" type="button" :aria-label="`Character ${index + 1}`" :aria-pressed="avatar === index" :class="{ selected: avatar === index }" @click="avatar = index">{{ character }}</button></fieldset>
    <p v-if="error" class="error" role="alert">{{ error }}</p><button class="button primary" :disabled="loading">{{ loading ? 'Saving…' : 'Continue →' }}</button>
  </form>
</template>
