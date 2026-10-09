export default defineNuxtConfig({
  compatibilityDate: '2026-10-05',
  ssr: false,
  devtools: { enabled: false },
  css: ['~/assets/main.css', '~/assets/styles/base.css', '~/assets/styles/welcome.css',
    '~/assets/styles/onboarding.css', '~/assets/styles/learning.css',
    '~/assets/styles/parent.css', '~/assets/styles/responsive.css', '~/assets/styles/lesson.css'],
  app: { head: { title: 'Bright Steps · Little steps, big discoveries',
    meta: [{ name: 'theme-color', content: '#ffd675' }] } },
})
