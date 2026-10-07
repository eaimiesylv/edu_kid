<?php

namespace App\Services;

use App\Models\User;

class Entitlements
{
    public function forParent(User $parent): array
    {
        return config('learning.free');
    }
}
