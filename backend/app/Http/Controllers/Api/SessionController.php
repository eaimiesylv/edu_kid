<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Child;
use App\Models\LearningSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SessionController extends Controller
{
    public function store(Request $request, Child $child): JsonResponse
    {
        abort_unless($child->user_id === $request->user()->id, 404);
        $payload = $request->validate([
            'id' => ['required', 'uuid'], 'started_at' => ['required', 'date', 'before_or_equal:'.now()->addMinutes(5)->toIso8601String()],
            'finished_at' => ['nullable', 'date', 'after_or_equal:started_at', 'before_or_equal:'.now()->addMinutes(5)->toIso8601String()],
        ]);
        $session = LearningSession::firstOrCreate(['id' => $payload['id']], ['child_id' => $child->id, 'started_at' => $payload['started_at']]);
        abort_unless($session->child_id === $child->id, 409);
        if ($payload['finished_at'] ?? null) {
            $session->update(['finished_at' => $payload['finished_at']]);
        }

        return response()->json($session);
    }
}
