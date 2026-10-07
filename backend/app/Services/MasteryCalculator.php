<?php

namespace App\Services;

class MasteryCalculator
{
    public function emptyRecord(): array
    {
        return ['score' => 0, 'independentSuccesses' => 0, 'assistedSuccesses' => 0, 'failures' => 0,
            'samples' => 0, 'lastPractised' => null, 'state' => 'new', 'contexts' => []];
    }

    public function apply(array $previous, array $attempt): array
    {
        if ($attempt['interactionFailure']) {
            return $previous;
        }
        $independent = $attempt['assistanceLevel'] === 0 && $attempt['hintsUsed'] === 0 && $attempt['firstAttempt'];
        $quality = $attempt['correct'] ? max(.15, 1 - $attempt['assistanceLevel'] * .18 - $attempt['hintsUsed'] * .1) : 0;
        $weight = min(.35, 1 / (min($previous['samples'], 5) + 1));
        $next = [
            ...$previous, 'score' => min(1, $previous['score'] * (1 - $weight) + $quality * $weight),
            'samples' => $previous['samples'] + 1, 'lastPractised' => $attempt['occurredAt'],
            'independentSuccesses' => $previous['independentSuccesses'] + (int) ($attempt['correct'] && $independent),
            'assistedSuccesses' => $previous['assistedSuccesses'] + (int) ($attempt['correct'] && ! $independent),
            'failures' => $previous['failures'] + (int) (! $attempt['correct']),
            'contexts' => array_values(array_unique([...$previous['contexts'], $attempt['gameType']])),
        ];
        $next['state'] = $this->deriveState($next);

        return $next;
    }

    public function deriveState(array $record): string
    {
        if (! $record['samples']) {
            return 'new';
        }
        if ($record['score'] >= .85 && $record['independentSuccesses'] >= 6 && count($record['contexts']) >= 2) {
            return 'mastered';
        }
        if ($record['score'] >= .75 && $record['independentSuccesses'] >= 3) {
            return 'independent';
        }
        if ($record['score'] >= .65) {
            return 'familiar';
        }
        if ($record['samples'] >= 4) {
            return 'practising';
        }

        return $record['samples'] > 1 ? 'learning' : 'introduced';
    }
}
