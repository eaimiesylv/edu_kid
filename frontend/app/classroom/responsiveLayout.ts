import type { RecognitionExercise } from './lessonConfig'
export type Position = [number, number, number]
export type LetterPose = { position: Position; scale: number; opacity: number }
export type ClassroomLayout = { mobile: boolean; board: boolean; letters: LetterPose[]; actors: Position[]; camera: { width: number; y: number } }
export function responsiveLayout(width: number, phase: string, choices: string[], exercise?: RecognitionExercise): ClassroomLayout {
  const mobile = width < 650
  const board = ['shape', 'imitate', 'pupil-one', 'pupil-two', 'trace-demo', 'trace'].includes(phase) || exercise?.layout === 'board'
  const recognition = phase.startsWith('recognition-')
  const tracing = phase === 'trace' || phase === 'trace-demo'
  const letters = choices.map((letter, index): LetterPose => {
    if (!recognition) {
      if (letter === 'A') return { position: board ? [0, 1.8, -1.6] : [0, -.75, .6], scale: board ? 1.7 : 1.5, opacity: 1 }
      return { position: [letter === 'B' ? -3.2 : 3.2, -1.4, 0], scale: .72, opacity: ['welcome', 'see'].includes(phase) ? .22 : 0 }
    }
    const layout = exercise?.layout ?? 'table'
    if (layout === 'board') return { position: [(index - 1) * 1.72, 1.8, -1.6], scale: .72, opacity: 1 }
    if (mobile || layout === 'mixed') {
      const positions: Position[] = [[-1.65, -1.2, .6], [1.65, -1.2, .6], [0, .65, .35]]
      return { position: positions[index]!, scale: .9, opacity: 1 }
    }
    return { position: [(index - 1) * 2.8, layout === 'staggered' && index !== 1 ? -.5 : -1.1, .6], scale: .95, opacity: 1 }
  })
  return { mobile, board, letters,
    actors: tracing
      ? mobile ? [[-1.85, -.3, -.6], [-2.1, 3.6, -2.1], [2.1, 3.6, -2.1]] : [[-3.1, -.3, -.7], [-3.2, 2.6, -2.4], [3.2, 2.6, -2.4]]
      : mobile ? [[-2.55, -.15, -1.2], [-2.55, 1.7, -2.1], [2.55, 1.7, -2.1]] : [[-4.7, -.1, -.7], [-2.65, .2, -2.4], [3.7, .2, -2.4]],
    camera: { width: tracing ? mobile ? 4.9 : 9.6 : mobile ? board ? 6.65 : 7.1 : board ? 12.3 : 14.1, y: tracing ? 1.65 : board ? 1.15 : .3 },
  }
}
