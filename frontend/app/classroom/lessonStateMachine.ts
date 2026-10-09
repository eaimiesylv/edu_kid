import { phaseById, type InputKind, type PhaseDefinition, type SceneAction, type SpeechId } from './lessonConfig'

export function abortError() { return new DOMException('Lesson state ended', 'AbortError') }
export function check(signal: AbortSignal) { if (signal.aborted) throw abortError() }
export function cancellableDelay(ms: number, signal: AbortSignal): Promise<void> {
  check(signal)
  return new Promise((resolve, reject) => {
    const done = () => { clearTimeout(timer); signal.removeEventListener('abort', cancel); resolve() }
    const cancel = () => { clearTimeout(timer); signal.removeEventListener('abort', cancel); reject(abortError()) }
    const timer = setTimeout(done, ms)
    signal.addEventListener('abort', cancel, { once: true })
  })
}

// The clock holds processing pauses and animations when the parent pauses a lesson.
export class LessonClock {
  paused = false
  async wait(ms: number, signal: AbortSignal) {
    let remaining = ms
    let previous = Date.now()
    while (remaining > 0) {
      await cancellableDelay(Math.min(40, remaining), signal)
      const now = Date.now()
      if (!this.paused) remaining -= now - previous
      previous = now
    }
    check(signal)
  }
}
export interface LessonRuntime {
  enter(phase: PhaseDefinition, signal: AbortSignal): void
  say(id: SpeechId, signal: AbortSignal): Promise<void>
  animate(action: SceneAction, signal: AbortSignal): Promise<void>
  wait(ms: number, signal: AbortSignal): Promise<void>
  waiting(kind: InputKind | null): void
  complete(id: string): void
  error(error: unknown): void
}
export class LessonStateMachine {
  private controller?: AbortController
  private pending?: { kind: InputKind; resolve: () => void }
  state = 'idle'
  constructor(private runtime: LessonRuntime) {}
  get waitingFor() { return this.pending?.kind ?? null }
  accept(kind: InputKind, correct: boolean): boolean {
    if (!correct || this.pending?.kind !== kind || this.controller?.signal.aborted) return false
    const pending = this.pending
    this.pending = undefined // Synchronous consumption rejects all rapid duplicate taps.
    this.runtime.waiting(null)
    pending.resolve()
    return true
  }
  stop() { this.controller?.abort(); this.pending = undefined; this.runtime.waiting(null) }
  async start(id = 'welcome') {
    this.stop()
    const controller = new AbortController()
    this.controller = controller
    const signal = controller.signal
    try {
      let phase = phaseById(id)
      while (phase) {
        check(signal)
        const phaseController = new AbortController()
        const cancelPhase = () => phaseController.abort()
        signal.addEventListener('abort', cancelPhase, { once: true })
        const phaseSignal = phaseController.signal
        this.state = phase.id
        try {
          this.runtime.enter(phase, phaseSignal)
          for (const step of phase.steps) {
            check(phaseSignal)
            if ('say' in step) await this.runtime.say(step.say, phaseSignal)
            if ('action' in step) await this.runtime.animate(step.action, phaseSignal)
            if ('wait' in step) await this.runtime.wait(step.wait, phaseSignal)
            if ('input' in step) await this.awaitInput(step.input, phaseSignal)
          }
          check(phaseSignal)
          this.runtime.complete(phase.id)
        } finally {
          signal.removeEventListener('abort', cancelPhase)
          phaseController.abort()
        }
        phase = phase.next ? phaseById(phase.next) : undefined
      }
    } catch (error) { if (!signal.aborted) this.runtime.error(error) }
  }
  private awaitInput(kind: InputKind, signal: AbortSignal): Promise<void> {
    check(signal)
    return new Promise((resolve, reject) => {
      const cancel = () => { this.pending = undefined; reject(abortError()) }
      this.pending = { kind, resolve: () => { signal.removeEventListener('abort', cancel); resolve() } }
      signal.addEventListener('abort', cancel, { once: true })
      this.runtime.waiting(kind)
    })
  }
}
