import { conceptById } from './curriculum'
import { readyForNext } from './mastery'
import { revisionDue } from './revision'
import type { Activity, ActivityKind, LearningModel, Session, Skill } from './types'

const teaching: [ActivityKind, Skill, number][] = [
  ['see', 'exposure', 4], ['hear', 'hearing', 3], ['watch', 'exposure', 4],
  ['guided', 'guided_writing', 4], ['trace', 'guided_writing', 2], ['write', 'independent_writing', 0],
]
export function shuffle<T>(values: T[], random = Math.random): T[] {
  const result = [...values]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j]!, result[i]!]
  }
  return result
}

export function selectConcept(session: Session, model: LearningModel, now: number): string {
  const ids = session.config.conceptIds
  const current = session.config.currentConceptId
  const revisit = ids.find(id => id !== current && ids.indexOf(id) < ids.indexOf(current)
    && (revisionDue(model, id, now) || (model[id]?.independent_writing?.score ?? 1) < .65))
  if (revisit && session.count % 4 === 0) return revisit
  const next = ids[ids.indexOf(current) + 1]
  if (next && readyForNext(model, current)) {
    session.config.currentConceptId = next
    return next
  }
  return current
}

export function selectStage(id: string, model: LearningModel, session: Session): [ActivityKind, Skill, number] {
  const progress = model[id] ?? {}
  const concept = conceptById(id)
  const canWrite = concept.capabilities.includes('guided_writing') && concept.strokes.length > 0
  if (session.failures >= 3) return [canWrite ? 'watch' : 'see', 'exposure', 4]
  if (!progress.exposure) return teaching[0]!
  if (concept.capabilities.includes('hearing') && !progress.hearing) return teaching[1]!
  if (canWrite && progress.exposure.samples < 2) return teaching[2]!
  if (canWrite && !progress.guided_writing) return teaching[3]!
  if (canWrite && progress.guided_writing!.samples < 2) return teaching[4]!
  if (concept.capabilities.includes('independent_writing') && !progress.independent_writing) return teaching[5]!
  if (session.count % 5 === 0 && progress.independent_writing && progress.independent_writing.score < .65) return teaching[5]!
  const skill: Skill = session.count % 3 === 0 ? 'discrimination' : session.count % 7 === 0 ? 'hearing' : 'recognition'
  const score = progress[skill]?.score ?? 0
  const supportedSkill = concept.capabilities.includes(skill) ? skill : 'recognition'
  return ['recognise', supportedSkill, score >= .45 ? 0 : session.failures > 0 ? 3 : 1]
}

export function nextActivity(session: Session, model: LearningModel, now = Date.now()): Activity {
  const id = selectConcept(session, model, now)
  const revision = id !== session.config.currentConceptId
  const weakWriting = revision && !revisionDue(model, id, now) && (model[id]?.independent_writing?.score ?? 1) < .65
  const [kind, skill, assistance] = weakWriting ? ['write', 'independent_writing', 0] as const
    : revision ? ['review', 'retention', 0] as const : selectStage(id, model, session)
  const difficulty = Math.min(3, 1 + Math.floor((model[id]?.recognition?.score ?? 0) * 3))
  const distractors = session.config.conceptIds.filter(other => other !== id).map(other => conceptById(other).value)
  const templates = ['road', 'bubbles', 'balloons', 'train', 'hidden'] as const
  return { id: crypto.randomUUID(), conceptId: id, kind, skill, assistance, difficulty,
    template: templates[session.count % templates.length]!, isRevision: revision,
    options: shuffle([conceptById(id).value, ...shuffle(distractors).slice(0, difficulty)]) }
}
