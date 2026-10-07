import { advanceSession, moveLesson, recordAttempt, startSession } from '../services/learning'
import { loadSnapshot, saveSnapshot } from '../services/storage'
import type { Child, Evidence, LearningConfig, LearningModel, Snapshot } from '../domain/types'

export function useLearning() {
  const snapshot = useState<Snapshot | null>('learning', () => null)
  const api = useApi(), syncer = useSync(snapshot)
  async function restore() {
    snapshot.value = await loadSnapshot() ?? null
    api.restoreToken()
  }
  async function configure(child: Child, config: LearningConfig) {
    let model: LearningModel = snapshot.value?.child.id === child.id ? snapshot.value.model : {}
    if (snapshot.value?.child.id !== child.id) {
      const report = await api.request<{ model: LearningModel | [] }>(`/children/${child.id}/report`)
      model = Array.isArray(report.model) ? {} : report.model
    }
    snapshot.value = { child, config, model, session: null }
    await saveSnapshot(snapshot.value)
  }
  async function start() { if (snapshot.value) await startSession(snapshot.value) }
  async function record(result: Partial<Evidence>) { if (snapshot.value) await recordAttempt(snapshot.value, result) }
  async function advance() {
    if (snapshot.value) await advanceSession(snapshot.value)
    void syncer.sync()
  }
  async function move(index: number) { if (snapshot.value) await moveLesson(snapshot.value, index) }
  return { snapshot, ...syncer, restore, configure, start, record, advance, move }
}
