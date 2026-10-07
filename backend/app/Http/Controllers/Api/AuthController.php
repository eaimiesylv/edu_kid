<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $request->merge(['email' => Str::lower((string) $request->input('email'))]);
        $payload = $request->validate([
            'name' => ['required', 'string', 'max:80'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:10', 'max:128'],
        ]);

        return $this->issueToken(User::create($payload), 201);
    }

    public function login(Request $request): JsonResponse
    {
        $payload = $request->validate(['email' => ['required', 'email'], 'password' => ['required', 'string']]);
        $user = User::where('email', Str::lower($payload['email']))->first();
        if (! $user || ! Hash::check($payload['password'], $user->password)) {
            throw ValidationException::withMessages(['email' => 'The email or password is incorrect.']);
        }

        return $this->issueToken($user);
    }

    private function issueToken(User $user, int $status = 200): JsonResponse
    {
        $token = Str::random(64);
        DB::table('device_tokens')->insert([
            'user_id' => $user->id, 'token_hash' => hash('sha256', $token),
            'expires_at' => now()->addDays(7), 'created_at' => now(), 'updated_at' => now(),
        ]);

        return response()->json(['token' => $token, 'user' => $user], $status);
    }

    public function logout(Request $request): JsonResponse
    {
        DB::table('device_tokens')->where('id', $request->attributes->get('device_token_id'))->delete();

        return response()->json(['message' => 'Signed out.']);
    }
}
