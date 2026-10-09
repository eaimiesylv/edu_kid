import type { RecognitionExercise } from './lessonConfig'

// Answer validation is independent of colour, position and the scene renderer.
export class RecognitionActivity {
  wrongAttempts = 0
  assisted = false
  answered = false
  constructor(readonly exercise: RecognitionExercise, readonly target = 'A') {}
  select(letter: string) {
    if (this.answered || !this.exercise.choices.includes(letter)) return null
    const correct = letter === this.target
    if (correct) this.answered = true
    else this.wrongAttempts++
    if (this.wrongAttempts >= 2) this.assisted = true
    return { correct, assisted: this.assisted, showHint: !correct && this.assisted }
  }
}
