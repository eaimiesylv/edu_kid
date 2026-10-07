import type { Concept, Skill } from './types'

export const skills: Skill[] = ['exposure', 'hearing', 'guided_writing', 'independent_writing', 'recognition', 'discrimination', 'retention']
const strokes = {
  A: [[{ x: .2, y: .85 }, { x: .5, y: .15 }], [{ x: .5, y: .15 }, { x: .8, y: .85 }], [{ x: .34, y: .55 }, { x: .66, y: .55 }]],
  B: [[{ x: .3, y: .15 }, { x: .3, y: .85 }], [{ x: .3, y: .15 }, { x: .6, y: .15 }, { x: .75, y: .28 }, { x: .6, y: .5 }, { x: .3, y: .5 }], [{ x: .3, y: .5 }, { x: .65, y: .5 }, { x: .78, y: .67 }, { x: .65, y: .85 }, { x: .3, y: .85 }]],
  C: [[{ x: .78, y: .22 }, { x: .6, y: .13 }, { x: .4, y: .15 }, { x: .23, y: .3 }, { x: .2, y: .5 }, { x: .23, y: .7 }, { x: .4, y: .85 }, { x: .6, y: .87 }, { x: .78, y: .78 }]],
}
export const curriculum: Concept[] = Object.entries(strokes).map(([value, paths]) => ({
  id: `letter-${value.toLowerCase()}`, value, type: 'letter', subject: 'english', level: 'letters',
  capabilities: [...skills], strokes: paths,
  narration: { see: `This is ${value}.`, hear: `${value}. Say ${value}.`, watch: `Watch how we write ${value}.`,
    guided: `Follow the path to write ${value}.`, trace: `Trace ${value}.`, write: `Write ${value}.`,
    recognise: `Touch ${value}.`, review: `Can you find ${value}?` },
}))
export const conceptById = (id: string) => curriculum.find(concept => concept.id === id)!
export const skillLabel = (skill: string) => skill.replaceAll('_', ' ').replace(/^./, letter => letter.toUpperCase())
