export function useNarration() {
  const available = ref(false)
  onMounted(() => { available.value = 'speechSynthesis' in window })
  function speak(text: string) {
    if (!available.value) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-GB'
    utterance.rate = .75
    utterance.pitch = 1.12
    window.speechSynthesis.speak(utterance)
  }
  onBeforeUnmount(() => { if (available.value) window.speechSynthesis.cancel() })
  return { speak, available }
}
