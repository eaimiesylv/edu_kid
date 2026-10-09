export const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
export const touchConfig = { exploration: 4, trials: 5, requiredCorrect: 4, arrangements: 3, struggleErrors: 2, reminderMs: 12000 }
export type Trial = { correct: boolean; arrangement: string; assisted: boolean }
export function mastered(trials: Trial[]) {
  const independent = trials.filter(t => !t.assisted)
  return independent.length >= touchConfig.trials && independent.filter(t => t.correct).length >= touchConfig.requiredCorrect && new Set(independent.map(t => t.arrangement)).size >= touchConfig.arrangements
}
export function arrangeChoices(target: string, distractors: string[], count: number, round: number, random = Math.random) {
  const pool = [...distractors]
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [pool[i], pool[j]] = [pool[j]!, pool[i]!] }
  const others = pool.slice(0, count - 1)
  others.splice((round + Math.floor(random() * count)) % count, 0, target)
  return others
}

export type TouchPhase = 'exploring' | 'review' | 'recognition-easy' | 'recognition-letters' | 'recognition-collection' | 'assessing' | 'reinforcing'
const transitions: Record<TouchPhase, TouchPhase[]> = {
  exploring: ['review', 'recognition-easy'], review: ['recognition-easy'],
  'recognition-easy': ['recognition-letters'], 'recognition-letters': ['recognition-collection'],
  'recognition-collection': ['assessing'], assessing: ['assessing', 'reinforcing', 'exploring'],
  reinforcing: ['recognition-letters'],
}
export function transitionAllowed(from: TouchPhase, to: TouchPhase) { return transitions[from].includes(to) }
