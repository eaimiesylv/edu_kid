<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SyncRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'child_id' => ['required', 'uuid'], 'attempts' => ['required', 'array', 'min:1', 'max:100'],
            'attempts.*.id' => ['required', 'uuid', 'distinct'], 'attempts.*.childId' => ['required', 'same:child_id'],
            'attempts.*.sessionId' => ['required', 'uuid'], 'attempts.*.activityId' => ['required', 'uuid'],
            'attempts.*.conceptId' => ['required', Rule::in(array_keys(config('learning.concepts')))],
            'attempts.*.skill' => ['required', Rule::in(config('learning.skills'))],
            'attempts.*.activity' => ['required', Rule::in(['see', 'hear', 'watch', 'guided', 'trace', 'write', 'recognise', 'review'])],
            'attempts.*.gameType' => ['required', Rule::in(config('learning.templates'))],
            'attempts.*.correct' => ['required', 'boolean'], 'attempts.*.firstAttempt' => ['required', 'boolean'],
            'attempts.*.hintsUsed' => ['required', 'integer', 'between:0,100'],
            'attempts.*.assistanceLevel' => ['required', 'integer', 'between:0,4'],
            'attempts.*.responseTimeMs' => ['required', 'integer', 'between:0,3600000'],
            'attempts.*.difficulty' => ['required', 'integer', 'between:1,3'],
            'attempts.*.interactionFailure' => ['required', 'boolean'],
            'attempts.*.occurredAt' => ['required', 'date', 'before_or_equal:'.now()->addMinutes(5)->toIso8601String()],
        ];
    }
}
