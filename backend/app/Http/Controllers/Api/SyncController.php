<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\SyncRequest;
use App\Models\Child;
use App\Services\AttemptIngestor;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class SyncController extends Controller
{
    public function store(SyncRequest $request, AttemptIngestor $ingestor): JsonResponse
    {
        $data = $request->validated();
        $accepted = DB::transaction(function () use ($request, $data, $ingestor): array {
            $child = Child::whereKey($data['child_id'])->where('user_id', $request->user()->id)->lockForUpdate()->firstOrFail();
            $ids = [];
            foreach ($data['attempts'] as $attempt) {
                $ids[] = $ingestor->ingest($child, $attempt);
            }

            return $ids;
        });

        return response()->json(['accepted' => $accepted]);
    }
}
