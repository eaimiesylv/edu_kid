import { describe, expect, it, vi } from 'vitest'
import { recognitionExercises, lesson, speech } from '../app/classroom/lessonConfig'
import { LessonStateMachine, cancellableDelay, type LessonRuntime } from '../app/classroom/lessonStateMachine'
import { NarrationManager, type NarrationDriver } from '../app/classroom/narrationManager'
import { tracingStrokes, evaluateTrace } from '../app/classroom/tracing'
import { responsiveLayout } from '../app/classroom/responsiveLayout'
import { ProgressStore, newProgress } from '../app/classroom/progressStore'
import { RecognitionActivity } from '../app/classroom/recognitionActivity'
import manifest from '../public/audio/letter-a/manifest.json'
import type { Point } from '../app/domain/types'

const samples = (path: Point[]) => Array.from({ length: 31 }, (_, index) => ({ x: path[0]!.x + (path[1]!.x - path[0]!.x) * index / 30, y: path[0]!.y + (path[1]!.y - path[0]!.y) * index / 30 }))
function runtime(overrides: Partial<LessonRuntime> = {}): LessonRuntime {
  return { enter: vi.fn(), say: async () => {}, animate: async () => {}, wait: async () => {}, waiting: vi.fn(), complete: vi.fn(), error: vi.fn(), ...overrides }
}
describe('deterministic child-first classroom', () => {
  it('declares teaching before touch and recognition, with five contexts', () => {
    expect(lesson.findIndex(row => row.id === 'see')).toBeLessThan(lesson.findIndex(row => row.id === 'touch'))
    expect(lesson.filter(row => row.recognition !== undefined)).toHaveLength(5)
    expect(lesson.findIndex(row => row.id === 'trace')).toBeLessThan(lesson.findIndex(row => row.id === 'recognition-0'))
    expect(speech.name).toBe('A.')
  })
  it('waits for essential narration and rejects taps outside input states', async () => {
    let finish!: () => void
    const calls: string[] = []
    const machine = new LessonStateMachine(runtime({ say: id => { calls.push(id); return new Promise(resolve => { finish = resolve }) } }))
    const task = machine.start('touch')
    await vi.waitFor(() => expect(calls).toEqual(['yourTurn']))
    expect(machine.accept('tap', true)).toBe(false)
    finish()
    await vi.waitFor(() => expect(machine.waitingFor).toBe('tap'))
    expect(machine.accept('tap', false)).toBe(false)
    expect(machine.accept('tap', true)).toBe(true)
    expect(machine.accept('tap', true)).toBe(false)
    machine.stop(); await task
  })
  it('cancels the old phase and restarts consistently without stale transitions', async () => {
    const signals: AbortSignal[] = []
    const entries: string[] = []
    const machine = new LessonStateMachine(runtime({ enter: (phase, signal) => { entries.push(phase.id); signals.push(signal) } }))
    const first = machine.start('recognition-0')
    await vi.waitFor(() => expect(machine.waitingFor).toBe('tap'))
    const second = machine.start('touch')
    await vi.waitFor(() => expect(machine.state).toBe('touch'))
    expect(signals[0]!.aborted).toBe(true)
    expect(entries).toEqual(['recognition-0', 'touch'])
    machine.stop(); await Promise.all([first, second])
    expect(machine.accept('tap', true)).toBe(false)
  })
  it('cancels state-bound pauses promptly', async () => {
    const controller = new AbortController()
    const wait = cancellableDelay(10000, controller.signal)
    controller.abort()
    await expect(wait).rejects.toMatchObject({ name: 'AbortError' })
  })
})
describe('recognition without answer cues', () => {
  it('rejects wrong answers and duplicates, hints after two mistakes', () => {
    const activity = new RecognitionActivity(recognitionExercises(7)[0]!)
    expect(activity.select('Z')).toBeNull()
    expect(activity.select('B')?.correct).toBe(false)
    expect(activity.select('C')?.showHint).toBe(true)
    expect(activity.select('A')).toMatchObject({ correct: true, assisted: true })
    expect(activity.select('A')).toBeNull()
  })
  it('uses seeded reproducible shuffles and changes target positions', () => {
    expect(recognitionExercises(123)).toEqual(recognitionExercises(123))
    expect(recognitionExercises(123)).not.toEqual(recognitionExercises(456))
    for (let seed = 0; seed < 100; seed++) {
      const rows = recognitionExercises(seed)
      rows.forEach((row, index) => {
        expect([...row.choices].sort()).toEqual(['A', 'B', 'C'])
        if (index) expect(row.choices.indexOf('A')).not.toBe(rows[index - 1]!.choices.indexOf('A'))
        const poses = responsiveLayout(390, row.id, row.choices, row).letters
        expect(new Set(poses.map(pose => pose.scale)).size).toBe(1)
        expect(poses.every(pose => pose.opacity === 1)).toBe(true)
      })
    }
  })
  it('makes A central and twice as large, repositions mobile actors and spaces hit areas', () => {
    for (const width of [390, 1440]) {
      const layout = responsiveLayout(width, 'see', ['B', 'A', 'C'])
      expect(layout.letters[1]!.position[0]).toBe(0)
      expect(layout.letters[1]!.scale / layout.letters[0]!.scale).toBeGreaterThanOrEqual(1.6)
      const exercise = recognitionExercises(4)[4]!
      const poses = responsiveLayout(width, exercise.id, exercise.choices, exercise).letters
      poses.forEach((pose, i) => poses.slice(i + 1).forEach(other => {
        const dx = Math.abs(pose.position[0] - other.position[0]), dy = Math.abs(pose.position[1] - other.position[1])
        expect(dx > pose.scale * 1.85 || dy > pose.scale * 2).toBe(true)
      }))
    }
    expect(responsiveLayout(390, 'see', ['A']).actors).not.toEqual(responsiveLayout(1440, 'see', ['A']).actors)
  })
})
describe('forgiving ordered uppercase tracing', () => {
  it('accepts all three down/down/across strokes with modest finger deviation', () => {
    tracingStrokes.forEach((path, index) => {
      const points = samples(path).map((point, i) => ({ x: point.x + Math.sin(i) * .025, y: point.y + Math.cos(i) * .025 }))
      expect(evaluateTrace(points, index).correct).toBe(true)
    })
  })
  it('rejects taps, scribbles, wrong stroke order and reversed strokes', () => {
    expect(evaluateTrace([{ x: .5, y: .13 }], 0).correct).toBe(false)
    expect(evaluateTrace(samples(tracingStrokes[2]!), 0).correct).toBe(false)
    expect(evaluateTrace(samples(tracingStrokes[0]!).reverse(), 0).correct).toBe(false)
    const scribble = [...samples(tracingStrokes[0]!), ...Array.from({ length: 60 }, (_, i) => ({ x: i % 2 ? .95 : .05, y: i % 3 ? .9 : .1 }))]
    expect(evaluateTrace(scribble, 0).correct).toBe(false)
  })
})
describe('serialized audio and local progress', () => {
  it('times out a stalled manifest request and preloads the built-in fallback instead', async () => {
    vi.useFakeTimers()
    const preload = vi.fn(async () => {})
    vi.stubGlobal('fetch', (_url: string, options: { signal: AbortSignal }) => new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(new DOMException('Cancelled', 'AbortError')), { once: true })
    }))
    try {
      const driver: NarrationDriver = { unlock() {}, preload, play: async () => {}, pause() {}, resume() {}, cancel() {}, dispose() {} }
      const manager = new NarrationManager(driver)
      const loading = manager.preload()
      await vi.advanceTimersByTimeAsync(2600); await loading
      expect(preload).toHaveBeenCalledOnce()
      expect(manager.manifest.name.text).toBe('A.')
    } finally { vi.useRealTimers(); vi.unstubAllGlobals() }
  })
  it('lists a replaceable audio asset and exact fallback script for every required line', () => {
    expect(Object.keys(manifest).sort()).toEqual(Object.keys(speech).sort())
    for (const [id, clip] of Object.entries(manifest)) {
      expect(clip.text).toBe(speech[id as keyof typeof speech])
      expect(clip.src).toBe(`/audio/letter-a/${id}.mp3`)
      expect(clip.available).toBe(false)
    }
  })
  it('plays once in order, never overlaps and cancels queued audio', async () => {
    const played: string[] = [], finishes: (() => void)[] = []
    let concurrent = 0, maximum = 0
    const driver: NarrationDriver = {
      unlock: vi.fn(), preload: async () => {}, pause: vi.fn(), resume: vi.fn(), cancel: vi.fn(), dispose: vi.fn(),
      play: (clip, _settings, signal) => new Promise((resolve, reject) => {
        played.push(clip.text); maximum = Math.max(maximum, ++concurrent)
        const abort = () => { concurrent--; reject(new DOMException('Cancelled', 'AbortError')) }
        signal.addEventListener('abort', abort, { once: true })
        finishes.push(() => { signal.removeEventListener('abort', abort); concurrent--; resolve() })
      }),
    }
    const manager = new NarrationManager(driver)
    const signal = new AbortController().signal
    const first = manager.speak('introduce', signal), second = manager.speak('name', signal)
    await vi.waitFor(() => expect(played).toEqual([speech.introduce]))
    finishes.shift()!(); await first
    await vi.waitFor(() => expect(played).toEqual([speech.introduce, speech.name]))
    finishes.shift()!(); await second
    expect(maximum).toBe(1)
    const third = manager.speak('find', signal), fourth = manager.speak('reward', signal)
    const settled = Promise.allSettled([third, fourth])
    await vi.waitFor(() => expect(played).toContain(speech.find))
    manager.cancel(); await settled
    expect(played).not.toContain(speech.reward)
    manager.pause(); manager.resume(); expect(driver.pause).toHaveBeenCalled(); expect(driver.resume).toHaveBeenCalled()
  })
  it('validates stored progress and survives unavailable storage', () => {
    const store = new ProgressStore(), data = newProgress(123)
    let saved: string | null = null
    vi.stubGlobal('localStorage', { setItem: (_key: string, value: string) => { saved = value }, getItem: () => saved })
    data.tracingCompleted = true; data.resume = 'recognition-2'; store.save(data)
    expect(store.load()).toEqual(data)
    saved = '{malformed'; expect(store.load().version).toBe(2)
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('Disabled') }, setItem: () => { throw new Error('Disabled') } })
    expect(() => store.save(data)).not.toThrow(); expect(store.load().resume).toBe('welcome')
    vi.unstubAllGlobals()
  })
})
