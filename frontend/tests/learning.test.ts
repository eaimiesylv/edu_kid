import { describe, expect, it } from 'vitest'
import { applyEvidence, emptyMastery, readyForNext } from '../app/domain/mastery'
import { nextActivity, shuffle } from '../app/domain/activity'
import { evaluateWriting } from '../app/domain/writing'
import { curriculum } from '../app/domain/curriculum'
import type { Evidence, LearningModel, Session } from '../app/domain/types'

function evidence(changes: Partial<Evidence> = {}): Evidence {
  return { id: crypto.randomUUID(), childId: crypto.randomUUID(), sessionId: crypto.randomUUID(), activityId: crypto.randomUUID(),
    conceptId: 'letter-a', skill: 'recognition', activity: 'recognise', gameType: 'cards', correct: true, firstAttempt: true,
    hintsUsed: 0, assistanceLevel: 0, responseTimeMs: 1500, difficulty: 2, interactionFailure: false,
    occurredAt: new Date().toISOString(), ...changes }
}
function session(): Session {
  return { id: crypto.randomUUID(), childId: crypto.randomUUID(), startedAt: new Date().toISOString(),
    finishedAt: null, count: 0, stars: 0, activity: null, failures: 0,
    config: { subject: 'english', conceptIds: curriculum.map(row => row.id), currentConceptId: 'letter-a' } }
}
describe('learning evidence', () => {
  it('counts assisted success separately and never calls it independent mastery', () => {
    let model: LearningModel = {}
    for (let i = 0; i < 30; i++) model = applyEvidence(model, evidence({ assistanceLevel: 4 }))
    expect(model['letter-a']!.recognition!.independentSuccesses).toBe(0)
    expect(model['letter-a']!.recognition!.state).not.toBe('mastered')
    expect(model['letter-a']!.recognition!.score).toBeLessThan(.3)
  })
  it('does not change knowledge after interaction failure', () => {
    const model = applyEvidence({}, evidence())
    expect(applyEvidence(model, evidence({ correct: false, interactionFailure: true }))).toEqual(model)
  })
  it('keeps writing independent from recognition', () => {
    const model = applyEvidence({}, evidence())
    expect(model['letter-a']!.independent_writing).toBeUndefined()
  })
  it('requires diverse independent evidence for mastered state', () => {
    let model: LearningModel = {}
    for (let i = 0; i < 20; i++) model = applyEvidence(model, evidence())
    expect(model['letter-a']!.recognition!.state).toBe('independent')
    model = applyEvidence(model, evidence({ gameType: 'balloons' }))
    expect(model['letter-a']!.recognition!.state).toBe('mastered')
  })
})
describe('adaptive selection', () => {
  it('teaches a new concept before testing', () => {
    expect(nextActivity(session(), {}).kind).toBe('see')
  })
  it('returns to demonstration after repeated struggle', () => {
    const state = session(); state.failures = 3
    expect(nextActivity(state, {}).kind).toBe('watch')
  })
  it('introduces B while preserving weak A writing', () => {
    const record = { ...emptyMastery(), score: .8, independentSuccesses: 3, samples: 7 }
    const model = { 'letter-a': { hearing: record, recognition: record, discrimination: record,
      independent_writing: { ...record, score: .2 } } }
    const state = session()
    expect(readyForNext(model, 'letter-a')).toBe(true)
    expect(nextActivity(state, model).conceptId).toBe('letter-b')
    expect(model['letter-a'].independent_writing.score).toBe(.2)
  })
  it('keeps distractors and progression within the selected boundary', () => {
    const state = session(); state.config.conceptIds = ['letter-a', 'letter-b']
    for (let i = 0; i < 12; i++) expect(nextActivity(state, {}).options).not.toContain('C')
  })
  it('reviews an overdue concept without deleting the current concept', () => {
    const state = session(); state.config.currentConceptId = 'letter-b'; state.count = 4
    const model = { 'letter-a': { recognition: { ...emptyMastery(), lastPractised: '2020-01-01T00:00:00Z' } } }
    expect(nextActivity(state, model).skill).toBe('retention')
    expect(state.config.currentConceptId).toBe('letter-b')
  })
  it('shuffles without mutating source options', () => {
    const original = ['A', 'B', 'C']
    expect(shuffle(original, () => 0)).toEqual(['B', 'C', 'A'])
    expect(original).toEqual(['A', 'B', 'C'])
  })
})
describe('writing evidence', () => {
  it('rejects blank writing as an interaction issue', () => {
    expect(evaluateWriting([], curriculum[0]!.strokes).interactionFailure).toBe(true)
  })
  it('recognises a complete path and rejects arbitrary scribbling', () => {
    const paths = curriculum[0]!.strokes
    expect(evaluateWriting(paths, paths).correct).toBe(true)
    expect(evaluateWriting([[{ x: 0, y: 0 }, { x: 1, y: 0 }]], paths).correct).toBe(false)
  })
})
