import type { ActivityKind, Point } from '../domain/types'

export function drawPath(context: CanvasRenderingContext2D, path: Point[], size: number) {
  context.beginPath()
  path.forEach((point, index) => {
    if (index === 0) context.moveTo(point.x * size, point.y * size)
    else context.lineTo(point.x * size, point.y * size)
  })
  context.stroke()
}
export function renderWriting(canvas: HTMLCanvasElement, strokes: Point[][], drawn: Point[][], guide: boolean, dot?: Point, kind?: ActivityKind) {
  const context = canvas.getContext('2d')!
  const size = canvas.width
  context.clearRect(0, 0, size, size)
  context.lineCap = 'round'; context.lineJoin = 'round'
  if (guide) {
    if (kind === 'watch' || kind === 'guided') {
      context.strokeStyle = '#d0d0d4'; context.lineWidth = size * .075; context.setLineDash([])
      strokes.forEach(path => drawPath(context, path, size))
    }
    context.strokeStyle = '#d3cfde'; context.lineWidth = size * .045; context.setLineDash([5, 12])
    if (kind === 'watch' || kind === 'guided') { context.strokeStyle = '#ffffff'; context.lineWidth = size * .006 }
    strokes.forEach(path => drawPath(context, path, size))
    context.setLineDash([])
  }
  context.strokeStyle = '#ff3f70'; context.lineWidth = size * .025
  drawn.forEach(path => drawPath(context, path, size))
  if (dot) {
    context.beginPath(); context.arc(dot.x * size, dot.y * size, 11, 0, Math.PI * 2)
    context.fillStyle = '#ffcf10'; context.fill()
  }
  if (kind === 'watch') paintStrokeOrder(context, strokes, size)
}

function paintStrokeOrder(context: CanvasRenderingContext2D, strokes: Point[][], size: number) {
  strokes.forEach((path, index) => {
    const start = path[0]!, end = path[path.length - 1]!
    const x = start.x * size + (index % 2 ? 28 : -28), y = start.y * size
    context.beginPath(); context.arc(x, y, 13, 0, Math.PI * 2)
    context.fillStyle = '#ff3f70'; context.fill()
    context.fillStyle = '#fff'; context.font = 'bold 16px Arial'; context.textAlign = 'center'
    context.fillText(String(index + 1), x, y + 5)
    const angle = Math.atan2(end.y - start.y, end.x - start.x)
    const tip = { x: (start.x * .4 + end.x * .6) * size, y: (start.y * .4 + end.y * .6) * size }
    context.strokeStyle = '#ff3f70'; context.lineWidth = 3
    context.beginPath(); context.moveTo(tip.x - 16 * Math.cos(angle - .5), tip.y - 16 * Math.sin(angle - .5))
    context.lineTo(tip.x, tip.y); context.lineTo(tip.x - 16 * Math.cos(angle + .5), tip.y - 16 * Math.sin(angle + .5)); context.stroke()
  })
}
