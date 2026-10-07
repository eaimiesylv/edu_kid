export type Skill = 'exposure' | 'hearing' | 'guided_writing' | 'independent_writing' | 'recognition' | 'discrimination' | 'retention'
export type MasteryState = 'new' | 'introduced' | 'learning' | 'practising' | 'familiar' | 'independent' | 'mastered' | 'revision'
export type ActivityKind = 'see' | 'hear' | 'watch' | 'guided' | 'trace' | 'write' | 'recognise' | 'review'
export type GameTemplate = 'cards' | 'road' | 'balloons' | 'bubbles' | 'train' | 'hidden' | 'catch'
export interface Point { x: number; y: number }
export interface Concept {
  id: string; value: string; type: string; subject: string; level: string
  capabilities: Skill[]; strokes: Point[][]; narration: Record<string, string>
}
export interface Evidence {
  id: string; childId: string; sessionId: string; activityId: string; conceptId: string
  skill: Skill; activity: ActivityKind; gameType: GameTemplate; correct: boolean
  firstAttempt: boolean; hintsUsed: number; assistanceLevel: number; responseTimeMs: number
  difficulty: number; interactionFailure: boolean; occurredAt: string
}
export interface Mastery {
  score: number; independentSuccesses: number; assistedSuccesses: number; failures: number
  samples: number; lastPractised: string | null; state: MasteryState; contexts: string[]
}
export type LearningModel = Record<string, Partial<Record<Skill, Mastery>>>
export interface Activity {
  id: string; conceptId: string; kind: ActivityKind; skill: Skill; assistance: number
  difficulty: number; template: GameTemplate; options: string[]; isRevision: boolean
  lessonStep?: number
}
export interface Child { id: string; name: string; age: number }
export interface LearningConfig { subject: string; conceptIds: string[]; currentConceptId: string }
export interface Session {
  id: string; childId: string; startedAt: string; finishedAt: string | null; count: number
  stars: number; activity: Activity | null; failures: number; config: LearningConfig
  completedActivityId?: string
  lessonIndex?: number; lessonActivities?: Activity[]; completedIds?: string[]
}
export interface Snapshot { child: Child; config: LearningConfig; model: LearningModel; session: Session | null }
