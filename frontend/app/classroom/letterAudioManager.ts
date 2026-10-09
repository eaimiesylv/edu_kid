import { BrowserNarrationDriver, type NarrationDriver, type VoiceClip } from './narrationManager'
import { alphabet } from './touchLesson'
// Only this allowlist can reach the voice driver, including manifest overrides.
export class LetterAudioManager {
  private clips = new Map<string, VoiceClip>()
  private lifetime = new AbortController()
  private active?: AbortController
  private disposed = false
  constructor(private driver: NarrationDriver = new BrowserNarrationDriver()) {
    for (const text of [...alphabet, 'Oops!']) this.clips.set(text, { text, src: `/audio/alphabet/${text}.mp3`, available: false })
  }
  async preload() {
    const timeout = setTimeout(() => this.lifetime.abort(), 2500)
    try {
      const response = await fetch('/audio/alphabet/manifest.json', { signal: this.lifetime.signal })
      if (response.ok) {
        const manifest = await response.json()
        for (const [text, clip] of this.clips) {
          const entry = manifest?.[text]
          if (entry?.available === true && typeof entry.src === 'string' && /^\/audio\/alphabet\/[A-Za-z0-9_-]+\.mp3$/.test(entry.src)) this.clips.set(text, { ...clip, src: entry.src, available: true })
        }
      }
    } catch { /* Browser voice remains available offline. */ }
    finally { clearTimeout(timeout) }
    if (!this.disposed) await this.driver.preload([...this.clips.values()])
  }
  unlock() { if (!this.disposed) this.driver.unlock() }
  async play(text: string, signal: AbortSignal) {
    const clip = this.clips.get(text)
    if (!clip || this.disposed || signal.aborted || this.active) return
    const active = new AbortController()
    this.active = active
    const abort = () => active.abort()
    signal.addEventListener('abort', abort, { once: true })
    try { await this.driver.play(clip, { rate: .85, volume: .85, muted: false }, active.signal) }
    finally { signal.removeEventListener('abort', abort); if (this.active === active) this.active = undefined }
  }
  dispose() { this.disposed = true; this.lifetime.abort(); this.active?.abort(); this.driver.dispose() }
}
