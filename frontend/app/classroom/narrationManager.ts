import { speech, type SpeechId } from './lessonConfig'
import { abortError, check, LessonClock } from './lessonStateMachine'

export type VoiceClip = { text: string; src: string; available: boolean }
export type VoiceManifest = Record<SpeechId, VoiceClip>
export const defaultManifest = Object.fromEntries(Object.entries(speech).map(([id, text]) => [id, { text, src: `/audio/letter-a/${id}.mp3`, available: false }])) as VoiceManifest
export type AudioSettings = { rate: number; volume: number; muted: boolean }
export interface NarrationDriver {
  unlock(): void
  preload(clips: VoiceClip[]): Promise<void>
  play(clip: VoiceClip, settings: AudioSettings, signal: AbortSignal): Promise<void>
  pause(): void
  resume(): void
  cancel(): void
  silence?(): void
  dispose(): void
}

export class BrowserNarrationDriver implements NarrationDriver {
  private assets = new Map<string, HTMLAudioElement>()
  private playing?: HTMLAudioElement
  private context?: AudioContext
  private paused = false
  private finishSilent?: () => void
  unlock() {
    if (typeof window === 'undefined') return
    try { this.context ??= new AudioContext(); void this.context.resume().catch(() => {}) } catch { /* Speech can still work without Web Audio. */ }
    // Audio element is primed inside the user's Start gesture, not during preload.
    for (const audio of this.assets.values()) { audio.muted = true; void audio.play().then(() => { audio.pause(); audio.currentTime = 0; audio.muted = false }).catch(() => { audio.muted = false }); break }
  }
  async preload(clips: VoiceClip[]) {
    await Promise.all(clips.filter(clip => clip.available).map(clip => new Promise<void>(resolve => {
      const audio = new Audio(clip.src)
      audio.preload = 'auto'
      const done = () => { clearTimeout(timeout); audio.oncanplaythrough = null; audio.onerror = null; resolve() }
      const timeout = setTimeout(done, 2500)
      audio.oncanplaythrough = () => { this.assets.set(clip.src, audio); done() }
      audio.onerror = done
      audio.load()
    })))
  }
  async play(clip: VoiceClip, settings: AudioSettings, signal: AbortSignal) {
    check(signal)
    const audio = clip.available ? this.assets.get(clip.src) : undefined
    if (audio) {
      try { await this.recording(audio, settings, signal); return }
      catch (error) { check(signal); /* Failed recording falls back to the same script. */ }
    }
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) throw new Error('Speech is unavailable')
    await this.tts(clip.text, settings, signal)
  }
  private recording(audio: HTMLAudioElement, settings: AudioSettings, signal: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      this.playing = audio
      audio.currentTime = 0; audio.volume = settings.volume; audio.muted = settings.muted; audio.playbackRate = settings.rate
      const cleanup = () => { clearInterval(watchdog); signal.removeEventListener('abort', abort); audio.onended = null; audio.onerror = null; this.playing = undefined }
      const finish = () => { audio.pause(); cleanup(); resolve() }
      const fail = () => { audio.pause(); cleanup(); reject(new Error('Voice clip failed')) }
      const abort = () => { audio.pause(); cleanup(); reject(abortError()) }
      let elapsed = 0
      const watchdog = setInterval(() => { if (!this.paused) elapsed += 250; if (elapsed > 15000) fail() }, 250)
      audio.onended = finish; audio.onerror = fail
      signal.addEventListener('abort', abort, { once: true })
      void audio.play().catch(fail)
      if (this.paused) audio.pause()
    })
  }
  private tts(text: string, settings: AudioSettings, signal: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      const engine = window.speechSynthesis
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'en-GB'; utterance.rate = settings.rate; utterance.pitch = 1; utterance.volume = settings.muted ? 0 : settings.volume
      const voices = engine.getVoices()
      const voice = voices.find(v => v.lang === 'en-GB' && /natural|premium|neural/i.test(v.name)) ?? voices.find(v => v.lang === 'en-GB') ?? voices.find(v => v.lang.startsWith('en'))
      if (voice) utterance.voice = voice
      let elapsed = 0
      const cleanup = () => { clearInterval(watchdog); signal.removeEventListener('abort', abort); utterance.onend = null; utterance.onerror = null; this.finishSilent = undefined }
      const finish = () => { cleanup(); resolve() }
      const fail = () => { cleanup(); engine.cancel(); reject(new Error('Browser voice unavailable')) }
      const abort = () => { cleanup(); engine.cancel(); reject(abortError()) }
      const watchdog = setInterval(() => { if (!this.paused) elapsed += 250; if (elapsed > 12000) fail() }, 250)
      utterance.onend = finish; utterance.onerror = fail
      signal.addEventListener('abort', abort, { once: true })
      this.finishSilent = () => { finish(); engine.cancel() }
      engine.speak(utterance)
      if (this.paused) engine.pause()
    })
  }
  pause() { this.paused = true; this.playing?.pause(); window.speechSynthesis?.pause() }
  resume() { this.paused = false; if (this.playing) void this.playing.play().catch(() => {}); window.speechSynthesis?.resume() }
  cancel() { this.playing?.pause(); window.speechSynthesis?.cancel() }
  silence() { if (this.playing) this.playing.muted = true; this.finishSilent?.() }
  dispose() { this.cancel(); this.assets.forEach(audio => { audio.removeAttribute('src'); audio.load() }); this.assets.clear(); void this.context?.close().catch(() => {}) }
}

export class NarrationManager {
  manifest: VoiceManifest = structuredClone(defaultManifest)
  settings: AudioSettings = { rate: .9, volume: .85, muted: false }
  current: SpeechId = 'hello'
  busy = false
  private tail: Promise<void> = Promise.resolve()
  private active?: AbortController
  private epoch = 0
  private clock = new LessonClock()
  constructor(private driver: NarrationDriver, private onCaption: (text: string) => void = () => {}, private onUnavailable: () => void = () => {}) {}
  async preload() {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 2500)
    try {
      const response = await fetch('/audio/letter-a/manifest.json', { signal: controller.signal })
      if (response.ok) {
        const overrides = await response.json()
        for (const id of Object.keys(speech) as SpeechId[]) {
          const entry = overrides[id]
          if (typeof entry?.text === 'string' && typeof entry?.src === 'string' && entry.src.startsWith('/audio/letter-a/') && typeof entry.available === 'boolean') this.manifest[id] = entry
        }
      }
    } catch { /* The built-in fixed lesson script is always available. */ }
    finally { clearTimeout(timeout) }
    await this.driver.preload(Object.values(this.manifest))
  }
  unlock() { this.driver.unlock() }
  speak(id: SpeechId, signal: AbortSignal) {
    const epoch = this.epoch
    const playback = this.tail.catch(() => {}).then(async () => {
      check(signal)
      if (epoch !== this.epoch) throw abortError()
      const controller = new AbortController()
      this.active = controller
      const abort = () => controller.abort()
      signal.addEventListener('abort', abort, { once: true })
      this.current = id; this.busy = true; this.onCaption(this.manifest[id].text)
      try {
        if (this.settings.muted) await this.clock.wait(Math.max(500, this.manifest[id].text.split(' ').length * 220), controller.signal)
        else await this.driver.play(this.manifest[id], this.settings, controller.signal)
      }
      catch (error) {
        check(controller.signal)
        this.onUnavailable()
        // Keep visual learning usable when the device has no voice; never pretend this is production audio.
        await this.clock.wait(Math.max(700, this.manifest[id].text.split(' ').length * 250), controller.signal)
      } finally { signal.removeEventListener('abort', abort); if (this.active === controller) { this.active = undefined; this.busy = false } }
    })
    this.tail = playback
    return playback
  }
  replay(signal: AbortSignal) { return this.busy ? Promise.resolve() : this.speak(this.current, signal) }
  setMuted(value: boolean) { this.settings.muted = value; if (value) this.driver.silence?.() }
  pause() { this.clock.paused = true; this.driver.pause() }
  resume() { this.clock.paused = false; this.driver.resume() }
  cancel() { this.epoch++; this.active?.abort(); this.driver.cancel(); this.tail = Promise.resolve(); this.busy = false }
  dispose() { this.cancel(); this.driver.dispose() }
}
