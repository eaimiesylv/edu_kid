import * as THREE from 'three'
import type { LetterPose, ClassroomLayout } from './responsiveLayout'
import type { SceneAction } from './lessonConfig'
export type ControlledLetter = { letter: string; group: THREE.Group; material: THREE.MeshPhysicalMaterial; collider: THREE.Mesh }
export const actionDuration: Record<SceneAction, number> = { focus: 600, 'to-board': 1500, 'to-table': 1300, 'pupil-one': 1700, 'pupil-two': 1700, jump: 750, push: 1200, celebrate: 1500 }

export class LetterController {
  private poses = new Map<THREE.Group, { from: THREE.Vector3; target: THREE.Vector3; startScale: number; scale: number; opacity: number }>()
  private elapsed = 0
  private action?: SceneAction
  private actionElapsed = 0
  constructor(public letters: ControlledLetter[]) {}
  layout(poses: LetterPose[], immediate = false) {
    this.poses.clear(); this.elapsed = immediate ? 1 : 0
    this.letters.forEach((letter, index) => {
      const pose = poses[index]!
      if (!pose) { letter.group.visible = false; return }
      this.poses.set(letter.group, { from: letter.group.position.clone(), target: new THREE.Vector3(...pose.position), startScale: letter.group.scale.x, scale: pose.scale, opacity: pose.opacity })
      letter.group.visible = pose.opacity > 0
      letter.material.transparent = pose.opacity < 1
      letter.material.opacity = pose.opacity
      // Hidden or dimmed distractors never intercept the child's tap.
      letter.collider.userData.enabled = pose.opacity === 1
      letter.material.color.setHex(letter.material.userData.baseColor)
    })
  }
  play(action: SceneAction) { this.action = action; this.actionElapsed = 0 }
  cancel() { this.action = undefined; this.actionElapsed = 0 }
  update(delta: number, reduced: boolean, hinted: boolean, phase: string) {
    this.elapsed = Math.min(1, this.elapsed + delta / (reduced ? .08 : 1.25))
    this.actionElapsed += delta * 1000
    const t = THREE.MathUtils.smoothstep(this.elapsed, 0, 1)
    const duration = this.action ? actionDuration[this.action] : 1
    const progress = Math.min(1, this.actionElapsed / duration)
    for (const letter of this.letters) {
      const pose = this.poses.get(letter.group)
      if (!pose) continue
      letter.group.position.lerpVectors(pose.from, pose.target, t)
      const size = THREE.MathUtils.lerp(pose.startScale, pose.scale, t)
      letter.group.scale.setScalar(size)
      letter.group.rotation.set(0, 0, 0)
      if (!reduced && ['shape', 'touch', 'trace-demo'].includes(phase)) letter.group.position.y += Math.sin(this.elapsed * Math.PI) * .25
      if (letter.letter === 'A' && progress < 1 && !reduced) {
        if (this.action === 'jump' || this.action?.startsWith('pupil-')) letter.group.position.y += Math.sin(progress * Math.PI) * .32
        if (this.action === 'push') letter.group.position.x += THREE.MathUtils.smoothstep(progress, 0, 1) * 1.65
      }
      if (this.action === 'push' && letter.letter === 'A' && progress === 1 && !reduced) letter.group.position.x += 1.65
      letter.material.emissive.setHex(hinted && letter.letter === 'A' ? 0xffdeb2 : 0x000000)
      letter.material.emissiveIntensity = hinted ? .16 : 0
    }
  }
}

export class CameraDirector {
  private target = new THREE.Vector3()
  private focus = new THREE.Vector3()
  private currentFocus = new THREE.Vector3()
  private initialized = false
  constructor(private camera: THREE.PerspectiveCamera) {}
  layout(width: number, y: number, aspect: number, immediate = false) {
    this.camera.aspect = aspect
    this.camera.fov = 38
    // Fit a deliberate mobile composition instead of shrinking the entire desktop room.
    const distance = width / (2 * Math.tan(THREE.MathUtils.degToRad(19)) * aspect)
    this.target.set(0, y + 1.2, Math.max(9.4, distance))
    this.focus.set(0, y, 0)
    this.camera.updateProjectionMatrix()
    if (!this.initialized || immediate) { this.camera.position.copy(this.target); this.currentFocus.copy(this.focus); this.initialized = true }
  }
  update(delta: number, reduced: boolean) {
    const ease = reduced ? 1 : 1 - Math.exp(-delta * 5)
    this.camera.position.lerp(this.target, ease); this.currentFocus.lerp(this.focus, ease); this.camera.lookAt(this.currentFocus)
  }
}

export class CharacterController {
  private target = new THREE.Vector3()
  private shoulder = new THREE.Vector3()
  private direction = new THREE.Vector3()
  private up = new THREE.Vector3(0, 1, 0)
  private layout?: ClassroomLayout
  constructor(private characters: THREE.Group[]) {}
  arrange(layout: ClassroomLayout) {
    this.layout = layout
    this.characters.forEach((character, index) => { character.scale.setScalar(layout.mobile ? index === 0 ? .62 : .4 : index === 0 ? .85 : .62) })
  }
  update(delta: number, time: number, phase: string, letter?: THREE.Group, action?: SceneAction, actionProgress = 0, reduced = false, hinted = false) {
    if (!this.layout) return
    const reach = action?.startsWith('pupil-') ? THREE.MathUtils.smoothstep(actionProgress, 0, 1) : 0
    this.characters.forEach((character, index) => {
      const home = this.layout!.actors[index]!
      const demonstrating = index === 1 && action === 'pupil-one' || index === 2 && action === 'pupil-two'
      this.target.set(...home)
      if (demonstrating && letter) {
        this.target.x = THREE.MathUtils.lerp(home[0], index === 1 ? -1.85 : 1.85, reach)
        this.target.y = THREE.MathUtils.lerp(home[1], .95, reach)
        this.target.z = THREE.MathUtils.lerp(home[2], -1.4, reach)
      }
      character.position.lerp(this.target, reduced ? 1 : 1 - Math.exp(-delta * 12))
      character.rotation.y = character.position.x < 0 ? .18 : -.18
      const arms = character.userData.arms as THREE.Mesh[]
      const pointer = character.userData.pointer as THREE.Mesh
      pointer.visible = false
      arms.forEach((arm, i) => { arm.position.set(i === 0 ? -.56 : .56, -.31, .14); arm.quaternion.identity(); arm.scale.set(.19, .48, .2) })
      const pointing = index === 0 && !['idle', 'welcome', 'reward'].includes(phase) && (!phase.startsWith('recognition-') || hinted) || demonstrating
      if (pointing && letter) {
        const arm = arms[character.position.x < letter.position.x ? 1 : 0]!
        character.updateMatrixWorld(true)
        this.target.copy(letter.position); character.worldToLocal(this.target)
        this.shoulder.set(arm === arms[1] ? .56 : -.56, -.05, .14)
        this.direction.copy(this.target).sub(this.shoulder)
        const distance = this.direction.length(), length = Math.min(distance, index === 0 ? 1.15 : 1.65)
        this.direction.normalize()
        arm.position.copy(this.shoulder).addScaledVector(this.direction, length / 2)
        arm.quaternion.setFromUnitVectors(this.up, this.direction); arm.scale.set(.13, length / 2, .13)
        if (index === 0 && distance > length) {
          const pointerLength = Math.min(distance - length, 4)
          pointer.visible = true; pointer.position.copy(this.shoulder).addScaledVector(this.direction, length + pointerLength / 2)
          pointer.quaternion.copy(arm.quaternion); pointer.scale.y = pointerLength
        }
      }
      if (phase === 'idle' || phase === 'welcome') { arms[1]!.rotation.z = -1.1 + (reduced ? 0 : Math.sin(time * 3) * .14) }
      if (action === 'celebrate') { arms[0]!.rotation.z = .85; arms[1]!.rotation.z = -.85; if (!reduced) character.position.y += Math.sin(actionProgress * Math.PI) * .1 }
    })
  }
}

export class InteractionManager {
  private raycaster = new THREE.Raycaster()
  private pointer = new THREE.Vector2()
  private previous = -Infinity
  constructor(private canvas: HTMLCanvasElement, private camera: THREE.Camera) {}
  select(event: PointerEvent, letters: ControlledLetter[], enabled: boolean, now: number): string | undefined {
    if (!enabled || now - this.previous < 300) return
    const rect = this.canvas.getBoundingClientRect()
    this.pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1)
    this.raycaster.setFromCamera(this.pointer, this.camera)
    const hit = this.raycaster.intersectObjects(letters.filter(letter => letter.group.visible && letter.collider.userData.enabled).map(letter => letter.collider), false)[0]
    if (!hit) return
    this.previous = now
    return hit.object.userData.letter as string
  }
}
