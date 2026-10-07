import type Phaser from 'phaser'
import type { Activity } from '../domain/types'

export function animateOption(scene: Phaser.Scene, container: Phaser.GameObjects.Container, activity: Activity, index: number) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  if (activity.template === 'train') scene.tweens.add({ targets: container, x: container.x + 32,
    duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
  if (activity.template === 'catch') scene.tweens.add({ targets: container, x: container.x + (index % 2 ? -35 : 35), y: container.y - 65,
    duration: 1800 + index * 200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
  if (['balloons', 'bubbles'].includes(activity.template)) scene.tweens.add({ targets: container, y: container.y - 28,
    duration: 2500 / activity.difficulty, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: index * 300 })
}
