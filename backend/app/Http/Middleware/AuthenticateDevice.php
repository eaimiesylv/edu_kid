<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateDevice
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->bearerToken();
        abort_unless($token, 401, 'Please sign in.');
        $device = DB::table('device_tokens')->where('token_hash', hash('sha256', $token))->where('expires_at', '>', now())->first();
        abort_unless($device, 401, 'Your sign-in has expired.');
        $user = User::findOrFail($device->user_id);
        $request->setUserResolver(fn (): User => $user);
        $request->attributes->set('device_token_id', $device->id);

        return $next($request);
    }
}
