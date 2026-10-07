import { describe, expect, it, vi } from 'vitest'
import { buildLesson } from '../app/domain/lesson'
import { advanceSession, moveLesson, recordAttempt, startSession } from '../app/services/learning'
import type { Snapshot } from '../app/domain/types'

vi.mock('../app/services/storage', () => ({ saveSnapshot: vi.fn(), persistAttempt: vi.fn() }))
function snapshot(): Snapshot {
  return { child: { id: crypto.randomUUID(), name: 'Teni', age: 4 }, model: {}, session: null,
    config: { subject: 'english', conceptIds: ['letter-a', 'letter-b', 'letter-c'], currentConceptId: 'letter-a' } }
}
describe('storyboard lessons', () => {
  it('builds all teaching, five recognition, catch and review screens for every letter', () => {
    const config = snapshot().config
    for (const id of config.conceptIds) {
      const lesson = buildLesson(config, id)
      expect(lesson.map(row => row.kind).slice(0, 6)).toEqual(['see', 'hear', 'watch', 'guided', 'trace', 'write'])
      expect(lesson.slice(6).map(row => row.template)).toEqual(['road', 'bubbles', 'balloons', 'train', 'hidden', 'catch', 'cards'])
      expect(lesson.every(row => row.conceptId === id)).toBe(true)
    }
  })
  it('does not count completed activities twice when navigating back', async () => {
    const state = snapshot(); await startSession(state)
    await recordAttempt(state, { correct: true }); await advanceSession(state)
    await moveLesson(state, 0); await recordAttempt(state, { correct: true })
    expect(state.session!.stars).toBe(1)
    expect(state.model['letter-a']!.exposure!.samples).toBe(1)
  })
  it('navigates skipped work without awarding evidence and resumes the same step', async () => {
    const state = snapshot(); await startSession(state)
    await moveLesson(state, 8); const id = state.session!.activity!.id
    await startSession(state)
    expect(state.session!.activity!.id).toBe(id)
    expect(state.session!.stars).toBe(0); expect(state.model).toEqual({})
  })
  it('finishes only after the final screen and can revisit mixed review', async () => {
    const state = snapshot(); await startSession(state)
    await moveLesson(state, 12); await advanceSession(state)
    expect(state.session!.activity).toBeNull()
    expect(state.session!.finishedAt).not.toBeNull()
    await moveLesson(state, 12)
    expect(state.session!.activity!.kind).toBe('review')
    expect(state.session!.finishedAt).toBeNull()
  })
})
