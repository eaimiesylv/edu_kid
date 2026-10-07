import { acknowledge, pendingAttempts } from '../services/storage'
import type { Snapshot } from '../domain/types'

export function useSync(snapshot: Ref<Snapshot | null>) {
  const api = useApi()
  const syncMessage = useState('sync-message', () => 'Saved on this device')
  const busy = useState('sync-busy', () => false)
  async function sync() {
    if (busy.value || !navigator.onLine || !api.token.value || !snapshot.value) return
    busy.value = true
    try {
      const state = snapshot.value
      const attempts = (await pendingAttempts()).filter(row => row.childId === state.child.id)
      for (let offset = 0; offset < attempts.length; offset += 100) {
        const response = await api.request<{ accepted: string[] }>('/sync', {
          method: 'POST', body: { child_id: state.child.id, attempts: attempts.slice(offset, offset + 100) },
        })
        await acknowledge(response.accepted)
      }
      if (state.session) await api.request(`/children/${state.child.id}/sessions`, {
        method: 'POST', body: { id: state.session.id, started_at: state.session.startedAt, finished_at: state.session.finishedAt },
      })
      await api.request(`/children/${state.child.id}/config`, { method: 'PUT', body: state.config })
      syncMessage.value = 'Progress synced'
    } catch { syncMessage.value = 'Saved on this device · sync pending' }
    finally { busy.value = false }
  }
  return { sync, syncMessage }
}
