import type Phaser from 'phaser'
import type { GameTemplate } from '../domain/types'

export function paintScenery(scene: Phaser.Scene, template: GameTemplate) {
  const width = scene.scale.width
  scene.add.image(width / 2, 200, 'woodland').setDisplaySize(width, 400)
  if (template === 'bubbles') {
    scene.add.rectangle(width / 2, 200, width, 400, 0x00b8ec, .75)
    for (let i = 0; i < 18; i++) scene.add.circle((i * 83) % width, (i * 67) % 400, 5 + i % 8, 0xffffff, .25)
  }
  if (template === 'road') {
    const road = scene.add.graphics()
    road.fillStyle(0x536075).fillTriangle(width * .38, 70, width * .05, 400, width * .95, 400)
    road.lineStyle(4, 0xffffff, .8)
    for (let y = 110; y < 400; y += 55) road.lineBetween(width / 2, y, width / 2, y + 25)
    scene.add.text(width / 2, 330, '🚗', { fontSize: '58px' }).setOrigin(.5)
  }
  if (template === 'train') {
    scene.add.rectangle(width / 2, 300, width, 6, 0x795332)
    scene.add.rectangle(width / 2, 325, width, 6, 0x795332)
    for (let x = 20; x < width; x += 40) scene.add.rectangle(x, 312, 7, 40, 0xad7643)
  }
  if (template === 'catch') {
    scene.add.ellipse(width / 2, 362, 145, 45, 0x87501f).setStrokeStyle(5, 0xf7bd66)
    scene.add.rectangle(width / 2, 373, 130, 48, 0xc48239).setStrokeStyle(4, 0x87501f)
    for (let x = -50; x <= 50; x += 20) scene.add.line(width / 2 + x, 370, 0, 0, 0, 40, 0xf4ba64).setLineWidth(3)
  }
  scene.add.image(52, 65, 'bird').setDisplaySize(74, 74)
  scene.add.rectangle(width / 2, 55, 220, 50, 0xffffff, .94).setStrokeStyle(2, 0xd0eeff)
}
