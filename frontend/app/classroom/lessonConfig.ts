export const speech = {
  hello: "Hello! Let's learn a new letter.",
  introduce: 'Look! This is A.', name: 'A.', look: 'Look at A!',
  imitate: 'Can you say A?', pupilOne: 'Watch our friend touch A.', pupilTwo: 'Now our other friend.',
  yourTurn: "Your turn. Touch A.", jump: 'Touch A to make it jump.',
  move: 'Touch A to move it to the star.', draw: "Let's draw A together.",
  downOne: 'Down.', downTwo: 'Down.', across: 'Across.', trace: 'Your turn. Follow the dot.',
  traceDown: 'Start at the top. Draw down to the dot.', traceAcross: 'Draw across to the dot.',
  traceRetry: 'A lovely try. Follow the path from the big dot.',
  find: 'Find A!', listen: 'Listen. A. Touch the letter you hear.', found: 'You found A!',
  retry: "Let's try again. Look carefully.", hint: 'Here is A. Look at its shape.',
  recall: 'What letter is this? Touch A.', reward: 'Great learning today!',
} as const
export type SpeechId = keyof typeof speech
export type SceneAction = 'focus' | 'to-board' | 'to-table' | 'pupil-one' | 'pupil-two' | 'jump' | 'push' | 'celebrate'
export type InputKind = 'tap' | 'trace'
export type Step = { say: SpeechId } | { action: SceneAction } | { wait: number } | { input: InputKind }
export type PhaseDefinition = { id: string; scene: 'table' | 'board' | 'trace' | 'recognition' | 'reward'; steps: Step[]; next?: string; recognition?: number }
export const lesson: PhaseDefinition[] = [
  { id: 'welcome', scene: 'table', steps: [{ say: 'hello' }, { action: 'focus' }], next: 'see' },
  { id: 'see', scene: 'table', steps: [{ say: 'introduce' }, { say: 'name' }, { wait: 650 }, { say: 'name' }, { wait: 650 }], next: 'shape' },
  { id: 'shape', scene: 'board', steps: [{ say: 'look' }, { action: 'to-board' }, { say: 'name' }, { wait: 700 }], next: 'imitate' },
  { id: 'imitate', scene: 'board', steps: [{ say: 'imitate' }, { wait: 3000 }], next: 'pupil-one' },
  { id: 'pupil-one', scene: 'board', steps: [{ say: 'pupilOne' }, { action: 'pupil-one' }, { say: 'name' }], next: 'pupil-two' },
  { id: 'pupil-two', scene: 'board', steps: [{ say: 'pupilTwo' }, { action: 'pupil-two' }, { say: 'name' }], next: 'touch' },
  { id: 'touch', scene: 'table', steps: [{ action: 'to-table' }, { say: 'yourTurn' }, { input: 'tap' }, { action: 'jump' }, { say: 'name' }], next: 'explore-jump' },
  { id: 'explore-jump', scene: 'table', steps: [{ say: 'jump' }, { input: 'tap' }, { action: 'jump' }, { say: 'name' }], next: 'explore-move' },
  { id: 'explore-move', scene: 'table', steps: [{ say: 'move' }, { input: 'tap' }, { action: 'push' }, { say: 'name' }], next: 'trace-demo' },
  { id: 'trace-demo', scene: 'trace', steps: [{ action: 'to-board' }, { say: 'draw' }, { input: 'trace' }], next: 'trace' },
  { id: 'trace', scene: 'trace', steps: [{ say: 'trace' }, { input: 'trace' }], next: 'recognition-0' },
  ...Array.from({ length: 5 }, (_, index): PhaseDefinition => ({
    id: `recognition-${index}`, scene: 'recognition', recognition: index,
    steps: [{ say: index === 3 ? 'listen' : 'find' }, { input: 'tap' }, { say: 'found' }],
    next: index === 4 ? 'recall' : `recognition-${index + 1}`,
  })),
  { id: 'recall', scene: 'table', steps: [{ say: 'recall' }, { input: 'tap' }, { say: 'name' }], next: 'reward' },
  { id: 'reward', scene: 'reward', steps: [{ action: 'celebrate' }, { say: 'reward' }] },
]
export const phaseById = (id: string) => lesson.find(phase => phase.id === id)

export function seededRandom(seed: number) {
  let value = seed >>> 0
  return () => { value += 0x6D2B79F5; let t = Math.imul(value ^ value >>> 15, 1 | value); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296 }
}
export function shuffled<T>(items: T[], random: () => number) {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [result[i], result[j]] = [result[j]!, result[i]!] }
  return result
}
export type RecognitionExercise = { id: string; choices: string[]; colors: number[]; layout: 'table' | 'staggered' | 'board' | 'listen' | 'mixed' }
export function recognitionExercises(seed: number): RecognitionExercise[] {
  const random = seededRandom(seed)
  let previous = -1
  return (['table', 'staggered', 'board', 'listen', 'mixed'] as const).map((layout, index) => {
    const choices = shuffled(['A', 'B', 'C'], random)
    const position = choices.indexOf('A')
    if (position === previous) { const other = (position + 1 + Math.floor(random() * 2)) % 3; [choices[position], choices[other]] = [choices[other]!, choices[position]!] }
    previous = choices.indexOf('A')
    return { id: `recognition-${index}`, choices, colors: shuffled([0x159be9, 0xf25650, 0x8658e8], random), layout }
  })
}
