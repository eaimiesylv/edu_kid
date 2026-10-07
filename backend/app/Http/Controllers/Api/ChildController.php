<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Child;
use App\Models\User;
use App\Services\Entitlements;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ChildController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json(Child::where('user_id', $request->user()->id)->orderBy('created_at')->get());
    }

    public function store(Request $request, Entitlements $entitlements): JsonResponse
    {
        $payload = $request->validate(['name' => ['required', 'string', 'max:80'], 'age' => ['required', 'integer', 'between:3,7']]);
        $child = DB::transaction(function () use ($request, $payload, $entitlements): Child {
            $parent = User::whereKey($request->user()->id)->lockForUpdate()->firstOrFail();
            $limit = $entitlements->forParent($parent)['max_children'];
            abort_if(Child::where('user_id', $parent->id)->count() >= $limit, 422, 'Your current plan supports one child.');

            return Child::create([...$payload, 'user_id' => $parent->id]);
        });

        return response()->json($child, 201);
    }
}
