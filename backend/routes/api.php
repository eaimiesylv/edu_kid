<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ChildController;
use App\Http\Controllers\Api\ConfigController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\SessionController;
use App\Http\Controllers\Api\SyncController;
use App\Services\Entitlements;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

Route::middleware('throttle:10,1,auth')->group(function (): void {
    Route::post('/auth/register', [AuthController::class, 'register']);
    Route::post('/auth/login', [AuthController::class, 'login']);
});
Route::get('/curriculum', function (): array {
    return ['subjects' => DB::table('subjects')->get(), 'levels' => DB::table('curriculum_levels')->get(),
        'concepts' => DB::table('concepts')->get(), 'skills' => DB::table('skills')->get()];
});
Route::middleware(['device.auth', 'throttle:120,1,learning'])->group(function (): void {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/children', [ChildController::class, 'index']);
    Route::post('/children', [ChildController::class, 'store']);
    Route::put('/children/{child}/config', [ConfigController::class, 'update']);
    Route::get('/children/{child}/report', [ReportController::class, 'show']);
    Route::post('/sync', [SyncController::class, 'store']);
    Route::post('/children/{child}/sessions', [SessionController::class, 'store']);
    Route::get('/entitlements', fn (Request $request, Entitlements $service): array => $service->forParent($request->user()));
});
