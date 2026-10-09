import type { Point } from '../domain/types'
import { samplePaths, distance, segmentDistance } from '../domain/writing'
// Both diagonals start at the apex; uppercase A is separate from lowercase a.
export const tracingStrokes: Point[][] = [
  [{ x: .5, y: .13 }, { x: .21, y: .85 }],
  [{ x: .5, y: .13 }, { x: .79, y: .85 }],
  [{ x: .33, y: .55 }, { x: .67, y: .55 }],
]
export function evaluateTrace(points: Point[], strokeIndex: number) {
  const path = tracingStrokes[strokeIndex]
  if (!path || points.length < 5) return { correct: false, reason: 'start' as const, coverage: 0, precision: 0 }
  const start = path[0]!, end = path[1]!
  const samples = samplePaths([points])
  if (distance(points[0]!, start) > .16) return { correct: false, reason: 'start' as const, coverage: 0, precision: 0 }
  const target = samplePaths([path])
  const coverage = target.filter(p => samples.some(q => distance(p, q) < .12)).length / target.length
  const precision = samples.filter(p => segmentDistance(p, start, end) < .15).length / Math.max(1, samples.length)
  const dx = end.x - start.x, dy = end.y - start.y, length = dx * dx + dy * dy
  const projections = points.map(p => ((p.x - start.x) * dx + (p.y - start.y) * dy) / length)
  let backwards = 0
  for (let i = 1; i < projections.length; i++) backwards += Math.max(0, projections[i - 1]! - projections[i]!)
  const correct = coverage >= .78 && precision >= .8 && distance(points[points.length - 1]!, end) < .16 && backwards < .5
  return { correct, reason: precision < .8 ? 'path' as const : 'direction' as const, coverage, precision }
}
