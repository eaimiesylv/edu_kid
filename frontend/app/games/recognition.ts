import type Phaser from 'phaser'
import type { Activity } from '../domain/types'
import { paintScenery } from './scenery'
import { animateOption } from './motion'
import { conceptById } from '../domain/curriculum'

export interface GameCallbacks { choose: (value: string) => void }
export function paintOptions(scene: Phaser.Scene, activity: Activity, callbacks: GameCallbacks) {
  const colors = [0xff3f70, 0x00b9ed, 0x773fff]
  const width = scene.scale.width
  const values = activity.template === 'catch' ? [...activity.options, conceptById(activity.conceptId).value] : activity.options
  return values.map((value, index) => {
    const x = width * (index + 1) / (values.length + 1)
    const y = activity.template === 'catch' ? 190 + (index % 2) * 60 : 190 + (index % 2) * 25
    const shape = ['cards', 'road', 'train'].includes(activity.template)
      ? scene.add.rectangle(0, 0, 112, 128, colors[index % colors.length])
      : scene.add.ellipse(0, 0, 112, activity.template === 'bubbles' ? 112 : 136, colors[index % colors.length], activity.template === 'bubbles' ? .6 : 1)
    const letter = scene.add.text(0, 0, value, { fontFamily: 'Arial, sans-serif', fontSize: '68px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(.5)
    const container = scene.add.container(x, y, [shape, letter]).setSize(112, 136)
    const cover = activity.template === 'hidden' ? scene.add.text(0, 0, '?', { fontSize: '80px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(.5) : null
    if (cover) { container.add(cover); letter.setVisible(false); shape.setFillStyle(0xc48239).setStrokeStyle(4, 0xf6ca6b) }
    container.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      if (cover?.visible) { cover.setVisible(false); letter.setVisible(true); shape.setFillStyle(colors[index % colors.length]!); return }
      if (activity.template === 'catch' && value === conceptById(activity.conceptId).value) {
        scene.tweens.killTweensOf(container)
        scene.tweens.add({ targets: container, x: width / 2, y: 365, scale: .2, duration: 350, onComplete: () => container.setVisible(false) })
      }
      callbacks.choose(value)
    })
    if (activity.template === 'train') for (const dx of [-35, 35]) container.add(scene.add.circle(dx, 76, 14, 0x283052).setStrokeStyle(4, 0xffcc24))
    if (activity.template === 'balloons') scene.add.line(x, y + 105, 0, 0, 0, 60, 0xb9aa8c).setLineWidth(2)
    animateOption(scene, container, activity, index)
    return { value, container, shape }
  })
}

export async function createRecognitionGame(parent: HTMLElement, activity: Activity, callbacks: GameCallbacks) {
  const PhaserModule = (await import('phaser')).default
  let options: ReturnType<typeof paintOptions> = []
  const game = new PhaserModule.Game({
    type: PhaserModule.AUTO, parent, width: 720, height: 400,
    backgroundColor: '#71d5ff', transparent: false,
    scale: { mode: PhaserModule.Scale.FIT, autoCenter: PhaserModule.Scale.CENTER_BOTH },
    scene: {
      preload(this: Phaser.Scene) { this.load.image('woodland', '/art/woodland.png'); this.load.image('bird', '/art/bluebird.png') },
      create(this: Phaser.Scene) {
        paintScenery(this, activity.template)
        scenePrompt(this, activity)
        options = paintOptions(this, activity, callbacks)
      },
    },
    audio: { noAudio: true },
  })
  function highlight(target: string) {
    for (const option of options) if (option.value === target) option.shape.setStrokeStyle(7, 0xde9350)
  }
  function pause(paused: boolean) {
    for (const scene of game.scene.getScenes(false)) {
      if (paused) scene.scene.pause()
      else scene.scene.resume()
    }
  }
  return { game, highlight, pause }
}

function scenePrompt(scene: Phaser.Scene, activity: Activity) {
  const target = conceptById(activity.conceptId).value
  const prompt = activity.template === 'hidden' ? `Reveal and find ${target}!` : `${activity.template === 'catch' ? 'Catch' : activity.kind === 'review' ? 'Touch' : 'Find'} ${target}!`
  scene.add.text(scene.scale.width / 2, 55, prompt,
    { fontFamily: 'Arial', fontSize: '22px', fontStyle: 'bold', color: '#131278' }).setOrigin(.5)
}
