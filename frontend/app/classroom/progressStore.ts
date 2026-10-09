export type Attempt = { phase: string; selected: string; correct: boolean; assisted: boolean; responseTimeMs: number }
export type ClassroomProgress = { version: 2; seed: number; resume: string; completed: string[]; attempts: Attempt[]; tracingCompleted: boolean; traceAttempts: number }
const key = 'bright-steps-classroom-v2'
export const newProgress = (seed = Date.now() >>> 0): ClassroomProgress => ({ version: 2, seed, resume: 'welcome', completed: [], attempts: [], tracingCompleted: false, traceAttempts: 0 })
export class ProgressStore {
  load(): ClassroomProgress {
    try {
      const data = JSON.parse(localStorage.getItem(key) ?? 'null')
      if (data?.version === 2 && Number.isInteger(data.seed) && typeof data.resume === 'string' && Array.isArray(data.completed) && Array.isArray(data.attempts) && typeof data.tracingCompleted === 'boolean' && Number.isInteger(data.traceAttempts)) return data
    } catch { /* Storage may be disabled by the browser. */ }
    return newProgress()
  }
  save(data: ClassroomProgress) { try { localStorage.setItem(key, JSON.stringify(data)) } catch { /* Keep the current in-memory lesson working. */ } }
}
