import { describe, expect, it } from 'vitest'
import { mastered, arrangeChoices } from '../app/classroom/touchLesson'
describe('touch alphabet mastery', () => {
  it('requires five independent trials and varied arrangements', () => {
    const rows = Array.from({ length: 5 }, (_, i) => ({ correct: i !== 4, arrangement: String(i % 3), assisted: false }))
    expect(mastered(rows)).toBe(true)
    expect(mastered(rows.slice(0, 4))).toBe(false)
    expect(mastered(rows.map(row => ({ ...row, assisted: true })))).toBe(false)
    expect(mastered(rows.map(row => ({ ...row, arrangement: 'same' })))).toBe(false)
    expect(mastered(rows.map((row, i) => ({ ...row, correct: i < 3 })))).toBe(false)
  })
  it('varies target positions and preserves the choices', () => {
    const positions = [0, 1, 2].map(round => arrangeChoices('B', ['A', 'C'], 3, round, () => .5).indexOf('B'))
    expect(new Set(positions).size).toBe(3)
  })
})
