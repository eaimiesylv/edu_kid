<?php

namespace App\Services;

use App\Models\Attempt;
use App\Models\Child;
use App\Models\LearningSession;
use App\Models\SkillMastery;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class AttemptIngestor
{
    public function __construct(private MasteryCalculator $calculator) {}

    public function ingest(Child $child, array $evidence): string
    {
        $existing = Attempt::find($evidence['id']);
        if ($existing) {
            abort_unless($existing->child_id === $child->id, 409, 'Attempt identifier belongs to another child.');

            return $existing->id;
        }
        $session = LearningSession::firstOrCreate(['id' => $evidence['sessionId']], [
            'child_id' => $child->id, 'started_at' => $evidence['occurredAt'],
        ]);
        abort_unless($session->child_id === $child->id, 409, 'Session identifier belongs to another child.');
        Attempt::create(['id' => $evidence['id'], 'child_id' => $child->id, 'session_id' => $session->id,
            'concept_id' => $evidence['conceptId'], 'skill' => $evidence['skill'], 'evidence' => $evidence, 'occurred_at' => $evidence['occurredAt']]);
        $this->rebuildMastery($child->id, $evidence['conceptId'], $evidence['skill']);
        $session->increment('reward_stars', (int) ($evidence['correct'] && ! $evidence['interactionFailure']));

        return $evidence['id'];
    }

    private function rebuildMastery(string $childId, string $conceptId, string $skill): void
    {
        $attempts = Attempt::where('child_id', $childId)->where('concept_id', $conceptId)->where('skill', $skill)
            ->orderBy('occurred_at')->orderBy('id')->get();
        $record = $this->calculator->emptyRecord();
        foreach ($attempts as $attempt) {
            $record = $this->calculator->apply($record, $attempt->evidence);
        }
        SkillMastery::updateOrCreate(['child_id' => $childId, 'concept_id' => $conceptId, 'skill' => $skill], ['record' => $record]);
        if ($record['lastPractised']) {
            $days = $record['score'] >= .85 ? 7 : ($record['score'] >= .65 ? 3 : 1);
            DB::table('revision_schedule')->updateOrInsert(['child_id' => $childId, 'concept_id' => $conceptId],
                ['due_at' => Carbon::parse($record['lastPractised'])->addDays($days)]);
        }
    }
}
