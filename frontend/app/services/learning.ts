import { nextActivity } from '../domain/activity'
import { buildLesson } from '../domain/lesson'
import { applyEvidence } from '../domain/mastery'
import { persistAttempt, saveSnapshot } from './storage'
import type { Evidence, Session, Snapshot } from '../domain/types'

export async function startSession(state: Snapshot): Promise<void> {
  const previous = state.session
  if (previous && !previous.finishedAt && previous.lessonActivities) {
    return
  }
  const session: Session = { id: crypto.randomUUID(), childId: state.child.id, startedAt: new Date().toISOString(),
    finishedAt: null, count: 0, stars: 0, activity: null, failures: 0, config: { ...state.config } }
  const initial = nextActivity(session, state.model)
  session.lessonActivities = buildLesson(session.config, initial.conceptId)
  session.lessonIndex = 0; session.completedIds = []
  session.activity = session.lessonActivities[0]!
  state.session = session
  await saveSnapshot(state)
}
export async function recordAttempt(state: Snapshot, result: Partial<Evidence>): Promise<void> {
  const session = state.session, activity = session?.activity
  if (!session || !activity || session.completedIds?.includes(activity.id)) return
  const evidence: Evidence = { id: crypto.randomUUID(), childId: state.child.id, sessionId: session.id,
    activityId: activity.id, conceptId: activity.conceptId, skill: activity.skill, activity: activity.kind,
    gameType: activity.template, correct: true, firstAttempt: true, hintsUsed: 0,
    assistanceLevel: activity.assistance, responseTimeMs: 0, difficulty: activity.difficulty,
    interactionFailure: false, occurredAt: new Date().toISOString(), ...result }
  state.model = applyEvidence(state.model, evidence)
  if (!evidence.interactionFailure) session.failures = evidence.correct ? 0 : session.failures + 1
  session.stars += Number(evidence.correct && !evidence.interactionFailure)
  if (evidence.correct && !evidence.interactionFailure) {
    session.count++; session.completedActivityId = activity.id
    session.completedIds = [...(session.completedIds ?? []), activity.id]
  }
  await persistAttempt(evidence, state)
}
export async function advanceSession(state: Snapshot): Promise<void> {
  const session = state.session
  if (!session) return
  const index = (session.lessonIndex ?? 0) + 1
  if (index >= (session.lessonActivities?.length ?? 0)) {
    session.finishedAt = new Date().toISOString(); session.activity = null
  } else { session.lessonIndex = index; session.activity = session.lessonActivities![index]! }
  state.config.currentConceptId = session.config.currentConceptId
  await saveSnapshot(state)
}

export async function moveLesson(state: Snapshot, index: number): Promise<void> {
  const session = state.session
  if (!session?.lessonActivities || index < 0 || index >= session.lessonActivities.length) return
  session.lessonIndex = index; session.activity = session.lessonActivities[index]!
  session.finishedAt = null; session.failures = 0
  await saveSnapshot(state)
}
