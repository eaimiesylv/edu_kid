<script setup lang="ts">
const props = defineProps<{ initialMode?: string }>()
const emit = defineEmits<{ authenticated: [] }>()
const api = useApi()
const mode = ref(props.initialMode ?? 'register'), name = ref(''), email = ref(''), password = ref('')
const showPassword = ref(false)
const error = ref(''), loading = ref(false)
async function submit() {
  loading.value = true; error.value = ''
  try {
    await api.authenticate(mode.value, { name: name.value, email: email.value, password: password.value })
    emit('authenticated')
  } catch (exception: any) { error.value = exception.data?.message ?? 'Could not connect. Please check that the backend is running.' }
  finally { loading.value = false }
}
</script>
<template>
  <form class="setup-form" @submit.prevent="submit">
    <h2>{{ mode === 'register' ? 'Create your account' : 'Welcome back!' }}</h2>
    <p>{{ mode === 'register' ? 'Let’s get started' : 'Sign in to keep learning' }}</p>
    <label v-if="mode === 'register'">Parent’s name<input v-model="name" autocomplete="name" placeholder="Your name" required maxlength="80"></label>
    <label>Email<input v-model="email" type="email" autocomplete="email" required></label>
    <label>Password<span class="password-field"><input aria-label="Password" v-model="password" :type="showPassword ? 'text' : 'password'" :autocomplete="mode === 'register' ? 'new-password' : 'current-password'" minlength="10" required><button type="button" :aria-label="showPassword ? 'Hide password' : 'Show password'" @click="showPassword = !showPassword">◉</button></span></label>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <button class="button primary" :disabled="loading">{{ loading ? 'One moment…' : mode === 'register' ? 'Continue →' : 'Sign in →' }}</button>
    <button class="text-button" type="button" @click="mode = mode === 'register' ? 'login' : 'register'">{{ mode === 'register' ? 'Already have an account? Sign in' : 'Create an account' }}</button>
  </form>
</template>
