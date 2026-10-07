import type { LearningModel } from './types'

export function revisionDue(model: LearningModel, id: string, now: number): boolean {
  const recognition = model[id]?.recognition
  if (!recognition?.lastPractised) return false
  const retention = model[id]?.retention
  const latest = Math.max(Date.parse(recognition.lastPractised), Date.parse(retention?.lastPractised ?? recognition.lastPractised))
  const days = recognition.score >= .85 ? 7 : recognition.score >= .65 ? 3 : 1
  return now - latest >= days * 86400000
}
