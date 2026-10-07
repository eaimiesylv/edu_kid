import type { Evidence, LearningModel, Mastery } from './types'

export function emptyMastery(): Mastery {
  return { score: 0, independentSuccesses: 0, assistedSuccesses: 0, failures: 0,
    samples: 0, lastPractised: null, state: 'new', contexts: [] }
}

export function deriveState(record: Mastery): Mastery['state'] {
  if (!record.samples) return 'new'
  if (record.score >= .85 && record.independentSuccesses >= 6 && record.contexts.length >= 2) return 'mastered'
  if (record.score >= .75 && record.independentSuccesses >= 3) return 'independent'
  if (record.score >= .65) return 'familiar'
  if (record.samples >= 4) return 'practising'
  return record.samples > 1 ? 'learning' : 'introduced'
}

export function applyEvidence(model: LearningModel, attempt: Evidence): LearningModel {
  if (attempt.interactionFailure) return model
  const previous = model[attempt.conceptId]?.[attempt.skill] ?? emptyMastery()
  const independent = attempt.assistanceLevel === 0 && attempt.hintsUsed === 0 && attempt.firstAttempt
  const quality = attempt.correct ? Math.max(.15, 1 - attempt.assistanceLevel * .18 - attempt.hintsUsed * .1) : 0
  const weight = Math.min(.35, 1 / (Math.min(previous.samples, 5) + 1))
  const next: Mastery = {
    ...previous, score: Math.min(1, previous.score * (1 - weight) + quality * weight),
    samples: previous.samples + 1, lastPractised: attempt.occurredAt,
    independentSuccesses: previous.independentSuccesses + Number(attempt.correct && independent),
    assistedSuccesses: previous.assistedSuccesses + Number(attempt.correct && !independent),
    failures: previous.failures + Number(!attempt.correct),
    contexts: [...new Set([...previous.contexts, attempt.gameType])],
  }
  next.state = deriveState(next)
  return { ...model, [attempt.conceptId]: { ...model[attempt.conceptId], [attempt.skill]: next } }
}

export function readyForNext(model: LearningModel, id: string): boolean {
  const record = model[id]
  return ['hearing', 'recognition', 'discrimination'].every(skill => {
    const value = record?.[skill as keyof typeof record]
    return value && value.score >= .65 && value.independentSuccesses >= 2
  })
}
