<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Child;
use App\Models\LearningConfig;
use App\Models\LearningSession;
use App\Models\SkillMastery;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    public function show(Request $request, Child $child): JsonResponse
    {
        abort_unless($child->user_id === $request->user()->id, 404);
        $model = [];
        foreach (SkillMastery::where('child_id', $child->id)->get() as $mastery) {
            $model[$mastery->concept_id][$mastery->skill] = $mastery->record;
        }
        $config = LearningConfig::where('child_id', $child->id)->first();

        return response()->json([
            'child' => $child, 'model' => $model,
            'config' => $config ? ['subject' => $config->subject, 'conceptIds' => $config->concept_ids, 'currentConceptId' => $config->current_concept_id] : null,
            'sessions' => LearningSession::where('child_id', $child->id)->latest('started_at')->limit(20)->get(),
            'revision' => DB::table('revision_schedule')->where('child_id', $child->id)->get(),
        ]);
    }
}
