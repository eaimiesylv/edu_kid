import { describe, expect, it } from 'vitest'
import { LetterAudioManager } from '../app/classroom/letterAudioManager'
import type { NarrationDriver } from '../app/classroom/narrationManager'
import { transitionAllowed } from '../app/classroom/touchLesson'
describe('letter playback lifecycle', () => {
  it('ignores narration and duplicate playback while a clip is active', async () => {
    const spoken: string[] = []
    let finish!: () => void
    const driver: NarrationDriver = {
      unlock() {}, async preload() {}, pause() {}, resume() {}, cancel() {}, dispose() {},
      play(clip) { spoken.push(clip.text); return new Promise<void>(resolve => { finish = resolve }) },
    }
    const manager = new LetterAudioManager(driver), signal = new AbortController().signal
    const first = manager.play('A', signal)
    await manager.play('A', signal)
    await manager.play('Find A', signal)
    await manager.play('Yes!', signal)
    expect(spoken).toEqual(['A'])
    finish(); await first
    await manager.play('Yes!', signal)
    expect(spoken).toEqual(['A'])
    const second = manager.play('B', signal)
    expect(spoken).toEqual(['A', 'B'])
    finish(); await second
    manager.dispose()
    await manager.play('C', signal)
    expect(spoken).toEqual(['A', 'B'])
  })
  it('aborts playback when the lesson closes', async () => {
    let aborted = false
    const driver: NarrationDriver = {
      unlock() {}, async preload() {}, pause() {}, resume() {}, cancel() {}, dispose() {},
      play(_clip, _settings, signal) { return new Promise<void>(resolve => signal.addEventListener('abort', () => { aborted = true; resolve() })) },
    }
    const manager = new LetterAudioManager(driver)
    const playback = manager.play('A', new AbortController().signal)
    manager.dispose(); await playback
    expect(aborted).toBe(true)
  })
  it('prevents bypassing practice or advancing directly from exploration', () => {
    expect(transitionAllowed('exploring', 'assessing')).toBe(false)
    expect(transitionAllowed('exploring', 'recognition-easy')).toBe(true)
    expect(transitionAllowed('assessing', 'reinforcing')).toBe(true)
    expect(transitionAllowed('recognition-letters', 'exploring')).toBe(false)
  })
})
