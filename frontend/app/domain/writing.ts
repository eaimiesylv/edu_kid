import type { Point } from './types'

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}
export function segmentDistance(point: Point, start: Point, end: Point): number {
  const dx = end.x - start.x, dy = end.y - start.y
  const length = dx * dx + dy * dy
  const t = length ? Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / length)) : 0
  return distance(point, { x: start.x + t * dx, y: start.y + t * dy })
}
export function samplePaths(paths: Point[][]): Point[] {
  return paths.flatMap(path => path.slice(1).flatMap((end, index) => {
    const start = path[index]!
    const steps = Math.ceil(distance(start, end) * 80)
    return Array.from({ length: steps + 1 }, (_, i) => ({
      x: start.x + (end.x - start.x) * i / steps, y: start.y + (end.y - start.y) * i / steps,
    }))
  }))
}
export function evaluateWriting(drawn: Point[][], expected: Point[][]) {
  const points = samplePaths(drawn), target = samplePaths(expected)
  if (points.length < 12) return { correct: false, coverage: 0, precision: 0, interactionFailure: true }
  const coverage = target.filter(point => points.some(other => distance(point, other) < .075)).length / target.length
  const precision = points.filter(point => target.some(other => distance(point, other) < .1)).length / points.length
  return { correct: coverage >= .72 && precision >= .65, coverage, precision, interactionFailure: false }
}
