<script setup lang="ts">
import * as THREE from 'three'
import { LetterController, CharacterController, CameraDirector, InteractionManager, actionDuration, type ControlledLetter } from '../classroom/sceneControllers'
import { responsiveLayout } from '../classroom/responsiveLayout'
import { abortError, check } from '../classroom/lessonStateMachine'
import type { RecognitionExercise, SceneAction } from '../classroom/lessonConfig'
const props = defineProps<{ phase: string; choices: string[]; exercise?: RecognitionExercise; enabled: boolean; hinted: boolean; paused: boolean }>()
const emit = defineEmits<{ select: [letter: string]; ready: []; boardLayout: [bounds: { left: number; top: number; width: number; height: number }] }>()
const host = ref<HTMLDivElement>()
const sceneError = ref('')
const anchors = ref<{ letter: string; left: number; top: number; width: number; height: number; visible: boolean }[]>([])
let renderer: THREE.WebGLRenderer | undefined, scene: THREE.Scene | undefined, camera: THREE.PerspectiveCamera | undefined
let resizeObserver: ResizeObserver | undefined, animationFrame = 0
let letters: ControlledLetter[] = [], characters: THREE.Group[] = []
let letterController: LetterController | undefined, characterController: CharacterController | undefined, cameraDirector: CameraDirector | undefined, interactions: InteractionManager | undefined
let logicalTime = 0, actionStarted = 0, activeAction: SceneAction | undefined
let actionPending: { resolve: () => void; reject: (error: unknown) => void; cleanup: () => void } | undefined
let reduced = false, initialized = false, lastProjection = 0
let star: THREE.Mesh | undefined
const projectPoint = new THREE.Vector3()
const screenBox = new THREE.Box3()
const colors: Record<string, number> = { A: 0x159be9, B: 0xf25650, C: 0x8658e8 }
function createAShape() {
  const shape = new THREE.Shape()
  shape.moveTo(-0.77, -0.9)
  shape.lineTo(-0.17, 0.86)
  shape.lineTo(0.17, 0.86)
  shape.lineTo(0.77, -0.9)
  shape.lineTo(0.38, -0.9)
  shape.lineTo(0.21, -0.38)
  shape.lineTo(-0.21, -0.38)
  shape.lineTo(-0.38, -0.9)
  shape.closePath()
  const hole = new THREE.Path()
  hole.moveTo(-0.13, -0.12)
  hole.lineTo(0.13, -0.12)
  hole.lineTo(0, 0.28)
  hole.closePath()
  shape.holes.push(hole)
  return shape
}

function createBShape() {
  const shape = new THREE.Shape()
  shape.moveTo(-0.68, -0.88)
  shape.lineTo(-0.68, 0.88)
  shape.lineTo(0.12, 0.88)
  shape.bezierCurveTo(0.94, 0.88, 0.94, 0.06, 0.38, 0)
  shape.bezierCurveTo(1.02, -0.1, 0.96, -0.88, 0.12, -0.88)
  shape.closePath()
  const upper = new THREE.Path()
  upper.moveTo(-0.28, 0.52)
  upper.lineTo(0.08, 0.52)
  upper.bezierCurveTo(0.44, 0.52, 0.44, 0.17, 0.08, 0.17)
  upper.lineTo(-0.28, 0.17)
  upper.closePath()
  const lower = new THREE.Path()
  lower.moveTo(-0.28, -0.18)
  lower.lineTo(0.08, -0.18)
  lower.bezierCurveTo(0.49, -0.18, 0.49, -0.53, 0.08, -0.53)
  lower.lineTo(-0.28, -0.53)
  lower.closePath()
  shape.holes.push(upper, lower)
  return shape
}

function createCShape() {
  const shape = new THREE.Shape()
  shape.moveTo(0.72, 0.69)
  shape.bezierCurveTo(0.45, 0.9, -0.12, 0.92, -0.53, 0.57)
  shape.bezierCurveTo(-0.98, 0.19, -0.97, -0.4, -0.56, -0.77)
  shape.bezierCurveTo(-0.18, -1.07, 0.39, -0.99, 0.72, -0.67)
  shape.lineTo(0.43, -0.36)
  shape.bezierCurveTo(0.09, -0.64, -0.38, -0.45, -0.38, 0)
  shape.bezierCurveTo(-0.38, 0.47, 0.12, 0.64, 0.43, 0.36)
  shape.closePath()
  return shape
}

function createLetterShape(letter: string) {
  if (letter === 'b') {
    const shape = new THREE.Shape()
    shape.moveTo(-.62, -.88); shape.lineTo(-.62, .88); shape.lineTo(-.28, .88); shape.lineTo(-.28, .24)
    shape.bezierCurveTo(.65, .65, 1, -.85, -.05, -.88); shape.closePath()
    const hole = new THREE.Path()
    hole.absellipse(.02, -.32, .27, .27, 0, Math.PI * 2, true, 0)
    shape.holes.push(hole)
    return shape
  }
  if (letter === 'c') {
    const shape = createCShape()
    const geometry = shape.getPoints(32)
    return new THREE.Shape(geometry.map(point => new THREE.Vector2(point.x * .8, point.y * .7 - .2)))
  }
  if (letter === 'A') return createAShape()
  if (letter === 'B') return createBShape()
  return createCShape()
}

function makeCharacter(x: number, fur: number, bib: number) {
  const group = new THREE.Group()
  const coat = new THREE.MeshStandardMaterial({ color: fur, roughness: 0.74 })
  const lightCoat = new THREE.MeshStandardMaterial({ color: 0xffd8a0, roughness: 0.78 })
  const clothes = new THREE.MeshStandardMaterial({ color: bib, roughness: 0.57 })
  const white = new THREE.MeshStandardMaterial({ color: 0xfffdf6, roughness: 0.3 })
  const dark = new THREE.MeshStandardMaterial({ color: 0x35251c, roughness: 0.35 })
  const addSphere = (material: THREE.Material, position: [number, number, number], scale: [number, number, number]) => {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), material)
    mesh.position.set(...position)
    mesh.scale.set(...scale)
    mesh.castShadow = true
    group.add(mesh)
    return mesh
  }
  addSphere(clothes, [0, -0.55, 0], [0.72, 0.75, 0.45])
  addSphere(coat, [0, 0.42, 0], [0.75, 0.7, 0.58])
  const leftArm = addSphere(coat, [-0.56, -0.31, 0.14], [0.19, 0.48, 0.2])
  const rightArm = addSphere(coat, [0.56, -0.31, 0.14], [0.19, 0.48, 0.2])
  group.userData.arms = [leftArm, rightArm]
  const teachingPointer = new THREE.Mesh(
    new THREE.CylinderGeometry(.035, .035, 1, 10),
    new THREE.MeshStandardMaterial({ color: 0x895530, roughness: .7 }),
  )
  teachingPointer.visible = false
  group.add(teachingPointer)
  group.userData.pointer = teachingPointer
  addSphere(coat, [-0.61, 0.92, -0.03], [0.22, 0.3, 0.2])
  addSphere(coat, [0.61, 0.92, -0.03], [0.22, 0.3, 0.2])
  addSphere(lightCoat, [0, 0.12, 0.48], [0.43, 0.29, 0.19])
  for (const eyeX of [-0.27, 0.27]) {
    addSphere(white, [eyeX, 0.55, 0.49], [0.19, 0.24, 0.12])
    addSphere(dark, [eyeX + 0.02, 0.54, 0.59], [0.092, 0.13, 0.06])
    addSphere(white, [eyeX - 0.01, 0.6, 0.64], [0.033, 0.045, 0.025])
  }
  addSphere(dark, [0, 0.25, 0.67], [0.12, 0.085, 0.07])
  addSphere(new THREE.MeshStandardMaterial({ color: 0xffd042, roughness: 0.42 }), [0, -0.04, 0.51], [0.07, 0.08, 0.04])
  group.position.set(x, -0.72, -0.65)
  group.rotation.y = x < 0 ? 0.23 : -0.23
  group.scale.setScalar(0.74)
  group.userData.homeY = group.position.y
  group.userData.phase = x < 0 ? 0.3 : 2.2
  scene!.add(group)
  return group
}

function createLighting() {
  const hemisphere = new THREE.HemisphereLight(0xfff2d5, 0x99643c, 2.1)
  const sunlight = new THREE.DirectionalLight(0xffe1a5, 3.1)
  sunlight.position.set(-4, 8, 7)
  sunlight.castShadow = true
  sunlight.shadow.mapSize.set(1024, 1024)
  sunlight.shadow.camera.left = -9
  sunlight.shadow.camera.right = 9
  sunlight.shadow.camera.top = 8
  sunlight.shadow.camera.bottom = -7
  const fill = new THREE.DirectionalLight(0xffffff, 1.2)
  fill.position.set(5, 3, 4)
  scene!.add(hemisphere, sunlight, fill)
}

function createClassroom() {
  const box = (size: [number, number, number], position: [number, number, number], color: number) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), new THREE.MeshStandardMaterial({ color, roughness: .8 }))
    mesh.position.set(...position); mesh.receiveShadow = true; scene!.add(mesh)
  }
  box([30, 20, .3], [0, 2, -4], 0xffe9b6)
  box([30, .2, 16], [0, -3.9, 0], 0xd7a070)
  box([5.9, 4.2, .3], [0, 1.8, -2.3], 0xa36738)
  box([5.55, 3.85, .15], [0, 1.8, -2.08], 0x397c70)
  box([6, .15, .55], [0, -.3, -2.05], 0xe0ad69)
  box([3, 3, .2], [6.1, 2.3, -3.7], 0xffffff)
  box([2.65, 2.65, .2], [6.1, 2.3, -3.55], 0xa8d9ec)
  box([.12, 2.7, .2], [6.1, 2.3, -3.4], 0xffffff)
  box([2.7, .12, .2], [6.1, 2.3, -3.4], 0xffffff)
}

function createTable() {
  const table = new THREE.Mesh(
    new THREE.BoxGeometry(12.8, 0.42, 2.5),
    new THREE.MeshStandardMaterial({ color: 0xf4ad4a, roughness: 0.46 }),
  )
  table.position.set(0, -2.42, 0.65)
  table.castShadow = true
  table.receiveShadow = true
  scene!.add(table)
  for (const x of [-4.9, 4.9]) {
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.18, 1.3, 12),
      new THREE.MeshStandardMaterial({ color: 0xb7662f, roughness: 0.7 }),
    )
    leg.position.set(x, -3.2, 0.7)
    leg.castShadow = true
    scene!.add(leg)
  }
}

function makeLetter(letter: string, index: number): ControlledLetter {
  const color = props.exercise?.colors[index] ?? colors[letter] ?? 0x159be9
  const material = new THREE.MeshPhysicalMaterial({ color, roughness: .35, clearcoat: .3, clearcoatRoughness: .3 })
  material.userData.baseColor = color
  const geometry = new THREE.ExtrudeGeometry(createLetterShape(letter), { depth: .35, bevelEnabled: true, bevelSegments: 3, bevelSize: .06, bevelThickness: .06, curveSegments: 16 })
  geometry.computeVertexNormals()
  const mesh = new THREE.Mesh(geometry, material); mesh.castShadow = true; mesh.receiveShadow = true
  const group = new THREE.Group(); group.add(mesh); group.position.set(0, -.75, .6); group.scale.setScalar(.9)
  const collider = new THREE.Mesh(new THREE.BoxGeometry(1.85, 2, .55), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }))
  collider.position.z = .18; collider.userData.letter = letter; group.add(collider)
  scene!.add(group)
  return { letter, group, material, collider }
}
function clearLetters() {
  letters.forEach(letter => {
    scene?.remove(letter.group)
    letter.group.traverse(object => { if (object instanceof THREE.Mesh) { object.geometry.dispose(); (object.material as THREE.Material).dispose() } })
  }); letters = []
}
function rebuildLetters() {
  if (!scene) return
  cancelAction()
  clearLetters(); letters = props.choices.map(makeLetter); letterController = new LetterController(letters)
  arrange(true)
}
function arrange(immediate = false) {
  if (!host.value || !camera || !renderer) return
  const width = host.value.clientWidth, height = host.value.clientHeight
  const layout = responsiveLayout(width, props.phase, props.choices, props.exercise)
  if (props.phase === 'trace' || props.phase === 'trace-demo') layout.letters.forEach(letter => { letter.opacity = 0 })
  letterController?.layout(layout.letters, immediate)
  characterController?.arrange(layout)
  cameraDirector?.layout(layout.camera.width, layout.camera.y, width / height, immediate || reduced)
  if (star) { star.visible = props.phase === 'explore-move'; star.position.set(1.65, -2.03, .65) }
  publishBounds()
}
function cancelAction() {
  if (actionPending) { const pending = actionPending; actionPending = undefined; pending.cleanup(); pending.reject(abortError()) }
  activeAction = undefined; letterController?.cancel()
}
function animate(action: SceneAction, signal: AbortSignal): Promise<void> {
  check(signal); cancelAction(); activeAction = action; actionStarted = logicalTime
  letterController?.play(action)
  return new Promise((resolve, reject) => {
    const abort = () => cancelAction()
    actionPending = { resolve, reject, cleanup: () => signal.removeEventListener('abort', abort) }
    signal.addEventListener('abort', abort, { once: true })
  })
}
defineExpose({ animate })
function onPointerDown(event: PointerEvent) {
  const selected = interactions?.select(event, letters, props.enabled && !props.paused, performance.now())
  if (selected) emit('select', selected)
}
function onKeyDown(event: KeyboardEvent) {
  if (!props.enabled || props.paused) return
  const value = props.choices.find(letter => letter === event.key.toUpperCase())
  if (value) { event.preventDefault(); emit('select', value) }
}
function publishBounds() {
  if (!camera || !renderer || !host.value) return
  const width = host.value.clientWidth, height = host.value.clientHeight
  camera.updateMatrixWorld()
  const screen = (x: number, y: number, z: number) => {
    projectPoint.set(x, y, z).project(camera!)
    return { x: (projectPoint.x + 1) / 2 * width, y: (1 - projectPoint.y) / 2 * height }
  }
  const start = screen(-1.55, 3.35, -1.45), end = screen(1.55, .25, -1.45)
  const size = Math.min(end.x - start.x, end.y - start.y)
  emit('boardLayout', { left: (start.x + end.x - size) / 2, top: (start.y + end.y - size) / 2, width: size, height: size })
  anchors.value = letters.map(letter => {
    letter.group.updateMatrixWorld(true)
    screenBox.setFromObject(letter.collider)
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const x of [screenBox.min.x, screenBox.max.x]) for (const y of [screenBox.min.y, screenBox.max.y]) for (const z of [screenBox.min.z, screenBox.max.z]) {
      const p = screen(x, y, z); minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y)
    }
    return { letter: letter.letter, left: minX, top: minY, width: maxX - minX, height: maxY - minY, visible: letter.group.visible && letter.collider.userData.enabled }
  })
}
function resize() {
  if (!host.value || !renderer) return
  renderer.setSize(host.value.clientWidth, host.value.clientHeight, false)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
  arrange(true)
}
function createRenderer() {
  if (!host.value) return
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap
  renderer.domElement.setAttribute('aria-label', 'Classroom with Teacher Sunny, pupils Milo and Lulu, and selectable three-dimensional letters.')
  renderer.domElement.setAttribute('role', 'img'); renderer.domElement.tabIndex = 0
  renderer.domElement.addEventListener('pointerdown', onPointerDown); renderer.domElement.addEventListener('keydown', onKeyDown)
  host.value.appendChild(renderer.domElement)
}
function createStar() {
  const shape = new THREE.Shape()
  for (let index = 0; index < 10; index++) {
    const radius = index % 2 ? .15 : .35, angle = index * Math.PI / 5 + Math.PI / 2
    if (!index) shape.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius)
    else shape.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius)
  }
  shape.closePath()
  star = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: .05, bevelEnabled: false }), new THREE.MeshStandardMaterial({ color: 0xffd264 }))
  star.rotation.x = -Math.PI / 2; scene!.add(star)
}
function startAnimation() {
  let previous = performance.now()
  const tick = (now: number) => {
    if (!renderer || !scene || !camera) return
    const delta = props.paused ? 0 : Math.min(.05, (now - previous) / 1000); previous = now; logicalTime += delta * 1000
    const duration = activeAction ? actionDuration[activeAction] : 1
    const progress = Math.min(1, (logicalTime - actionStarted) / duration)
    letterController?.update(delta, reduced, props.hinted, props.phase)
    characterController?.update(delta, logicalTime / 1000, props.phase, letters.find(letter => letter.letter === 'A')?.group, activeAction, progress, reduced, props.hinted)
    cameraDirector?.update(delta, reduced)
    renderer.render(scene, camera)
    if (now - lastProjection > 90) { publishBounds(); lastProjection = now }
    if (actionPending && progress === 1) { const pending = actionPending; actionPending = undefined; pending.cleanup(); pending.resolve() }
    animationFrame = requestAnimationFrame(tick)
  }
  animationFrame = requestAnimationFrame(tick)
}
function init() {
  try {
    scene = new THREE.Scene(); scene.background = new THREE.Color(0xffe9c5)
    camera = new THREE.PerspectiveCamera(38, 1, .1, 100)
    createRenderer(); createLighting(); createClassroom(); createTable(); createStar()
    characters = [makeCharacter(-4.45, 0xb9783d, 0x3ba8e5), makeCharacter(-3.8, 0xa64c2c, 0x73c756), makeCharacter(3.8, 0xd9ad74, 0xf18bae)]
    characterController = new CharacterController(characters); cameraDirector = new CameraDirector(camera)
    interactions = new InteractionManager(renderer!.domElement, camera)
    reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    initialized = true; rebuildLetters(); resizeObserver = new ResizeObserver(resize); resizeObserver.observe(host.value!); resize(); startAnimation(); emit('ready')
  } catch { sceneError.value = 'The classroom could not open. Please reload and try again.' }
}
// Phase and content change together. A separate phase watcher could arrange three
// old meshes with the single-letter recall layout before rebuilding them.
watch(() => [props.phase, props.choices, props.exercise], () => {
  if (!initialized) return
  cancelAction()
  if (letters.length !== props.choices.length || letters.some((letter, index) => letter.letter !== props.choices[index]) || props.exercise) rebuildLetters()
  else arrange()
}, { deep: true })
onMounted(init)
onBeforeUnmount(() => {
  cancelAction(); cancelAnimationFrame(animationFrame); resizeObserver?.disconnect(); clearLetters()
  scene?.traverse(object => { if (object instanceof THREE.Mesh) { object.geometry.dispose(); if (Array.isArray(object.material)) object.material.forEach(material => material.dispose()); else object.material.dispose() } })
  renderer?.domElement.removeEventListener('pointerdown', onPointerDown); renderer?.domElement.removeEventListener('keydown', onKeyDown); renderer?.dispose(); renderer?.domElement.remove()
})
</script>
<template>
  <div ref="host" class="three-stage">
    <p v-if="sceneError" role="alert" class="scene-error">{{ sceneError }}</p>
    <button v-for="anchor in anchors.filter(item => item.visible)" :key="anchor.letter" class="letter-hit-target" :aria-label="`Touch letter ${anchor.letter}`" :disabled="!enabled || paused" :style="{ left: `${anchor.left}px`, top: `${anchor.top}px`, width: `${anchor.width}px`, height: `${anchor.height}px` }" @click="emit('select', anchor.letter)"><span class="sr-only">{{ anchor.letter }}</span></button>
  </div>
</template>
<style scoped>
.three-stage { position:absolute; inset:0; overflow:hidden; touch-action:manipulation; }
.three-stage :deep(canvas) { display:block; width:100%; height:100%; outline:none; }
.letter-hit-target { position:absolute; padding:0; margin:0; border:0; background:transparent; border-radius:18px; cursor:pointer; touch-action:manipulation; }
.letter-hit-target:focus-visible { outline:4px solid #fff5bd; outline-offset:5px; }
.letter-hit-target:disabled { cursor:default; }
.scene-error { position:absolute; z-index:5; inset:40% 10% auto; text-align:center; padding:20px; background:#fff9e9; border-radius:20px; color:#71451d; }
.sr-only { position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; }
</style>
