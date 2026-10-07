import { openDB } from 'idb'
import type { Evidence, Snapshot } from '../domain/types'

const database = () => openDB('bright-steps', 1, {
  upgrade(db) {
    db.createObjectStore('snapshots')
    db.createObjectStore('attempts', { keyPath: 'id' })
    db.createObjectStore('settings')
  },
})
export async function saveSnapshot(snapshot: Snapshot): Promise<void> {
  const db = await database()
  await db.put('snapshots', JSON.parse(JSON.stringify(snapshot)), snapshot.child.id)
  await db.put('settings', snapshot.child.id, 'activeChild')
}
export async function loadSnapshot(): Promise<Snapshot | undefined> {
  const db = await database()
  const id = await db.get('settings', 'activeChild')
  return id ? db.get('snapshots', id) : undefined
}
export async function queueAttempt(attempt: Evidence): Promise<void> {
  await (await database()).put('attempts', JSON.parse(JSON.stringify(attempt)))
}
export async function persistAttempt(attempt: Evidence, snapshot: Snapshot): Promise<void> {
  const db = await database()
  const tx = db.transaction(['attempts', 'snapshots', 'settings'], 'readwrite')
  await tx.objectStore('attempts').put(JSON.parse(JSON.stringify(attempt)))
  await tx.objectStore('snapshots').put(JSON.parse(JSON.stringify(snapshot)), snapshot.child.id)
  await tx.objectStore('settings').put(snapshot.child.id, 'activeChild')
  await tx.done
}
export async function pendingAttempts(): Promise<Evidence[]> {
  return (await database()).getAll('attempts')
}
export async function acknowledge(ids: string[]): Promise<void> {
  const db = await database()
  const tx = db.transaction('attempts', 'readwrite')
  for (const id of ids) await tx.store.delete(id)
  await tx.done
}
export async function forgetDevice(): Promise<void> {
  const db = await database()
  const tx = db.transaction(['snapshots', 'attempts', 'settings'], 'readwrite')
  await Promise.all([tx.objectStore('snapshots').clear(), tx.objectStore('attempts').clear(), tx.objectStore('settings').clear()])
  await tx.done
}
