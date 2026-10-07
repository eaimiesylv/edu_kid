<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Child;
use App\Models\LearningConfig;
use App\Services\Entitlements;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ConfigController extends Controller
{
    public function update(Request $request, Child $child, Entitlements $entitlements): JsonResponse
    {
        abort_unless($child->user_id === $request->user()->id, 404);
        $allowed = $entitlements->forParent($request->user())['concept_ids'];
        $payload = $request->validate([
            'subject' => ['required', Rule::in(['english'])],
            'conceptIds' => ['required', 'array', 'min:1', 'max:3'],
            'conceptIds.*' => ['required', 'string', 'distinct', Rule::in($allowed)],
            'currentConceptId' => ['required', Rule::in(is_array($request->input('conceptIds')) ? $request->input('conceptIds') : [])],
        ]);
        $config = LearningConfig::updateOrCreate(['child_id' => $child->id], [
            'subject' => $payload['subject'], 'concept_ids' => $payload['conceptIds'], 'current_concept_id' => $payload['currentConceptId'],
        ]);

        return response()->json($config);
    }
}
