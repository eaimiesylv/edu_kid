import { conceptById } from './curriculum'
import { shuffle } from './activity'
import type { Activity, ActivityKind, GameTemplate, LearningConfig, Skill } from './types'

export const lessonSteps: { title: string; subtitle: string; kind: ActivityKind; skill: Skill; help: number; template: GameTemplate }[] = [
  { title: 'See', subtitle: 'Introduce', kind: 'see', skill: 'exposure', help: 4, template: 'cards' },
  { title: 'Hear', subtitle: 'Listen and repeat', kind: 'hear', skill: 'hearing', help: 3, template: 'cards' },
  { title: 'Watch Writing', subtitle: 'Watch the strokes', kind: 'watch', skill: 'exposure', help: 4, template: 'cards' },
  { title: 'Guided Writing', subtitle: 'Follow the dot', kind: 'guided', skill: 'guided_writing', help: 4, template: 'cards' },
  { title: 'Practice Writing', subtitle: 'Trace with less help', kind: 'trace', skill: 'guided_writing', help: 2, template: 'cards' },
  { title: 'Independent Writing', subtitle: 'Now you write', kind: 'write', skill: 'independent_writing', help: 0, template: 'cards' },
  { title: 'Find', subtitle: 'Road lanes', kind: 'recognise', skill: 'recognition', help: 0, template: 'road' },
  { title: 'Find', subtitle: 'Underwater bubbles', kind: 'recognise', skill: 'recognition', help: 0, template: 'bubbles' },
  { title: 'Find', subtitle: 'Sky balloons', kind: 'recognise', skill: 'recognition', help: 0, template: 'balloons' },
  { title: 'Find', subtitle: 'Moving train', kind: 'recognise', skill: 'discrimination', help: 0, template: 'train' },
  { title: 'Find', subtitle: 'Hidden letters', kind: 'recognise', skill: 'recognition', help: 0, template: 'hidden' },
  { title: 'Letter Game', subtitle: 'Catch the letter', kind: 'recognise', skill: 'recognition', help: 0, template: 'catch' },
  { title: 'Mixed Review', subtitle: 'Listen and choose', kind: 'review', skill: 'retention', help: 0, template: 'cards' },
]

export function buildLesson(config: LearningConfig, conceptId: string): Activity[] {
  const target = conceptById(conceptId).value
  const options = config.conceptIds.map(id => conceptById(id).value)
  return lessonSteps.map((step, index) => ({ id: crypto.randomUUID(), conceptId, kind: step.kind,
    skill: step.skill, assistance: step.help, difficulty: Math.min(3, options.length), template: step.template,
    options: shuffle([target, ...options.filter(value => value !== target)]), isRevision: step.kind === 'review', lessonStep: index }))
}
